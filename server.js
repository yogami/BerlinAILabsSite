const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'gopal.yami@gmail.com';
const CALENDLY_URL = process.env.CALENDLY_URL || 'https://calendly.com/berlin-ai-labs/30min';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Single-use ephemeral booking token store
const ephemeralBookingTokens = new Map();

// Rate limiting store for IP addresses (Max 3 form submissions per 10 minutes)
const triageRateLimits = new Map();

// Known disposable / spam email domain blacklist
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com',
  'trashmail.com', 'dispostable.com', 'yopmail.com', 'getnada.com', 'sharklasers.com',
  'throwawaymail.com', 'maildrop.cc', 'tempmailo.com', 'temp-mail.org', 'crazymailing.com'
]);

// Initialize PostgreSQL Pool if DATABASE_URL exists
let dbPool = null;
if (DATABASE_URL) {
  dbPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway.internal') ? false : { rejectUnauthorized: false }
  });

  // Initialize PostgreSQL tables & B2B Firmographic columns automatically
  dbPool.query(`
    CREATE TABLE IF NOT EXISTS visitor_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      host TEXT,
      path TEXT,
      ip TEXT,
      company TEXT,
      city TEXT,
      country TEXT,
      org TEXT,
      referrer TEXT,
      user_agent TEXT
    );
    ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS company TEXT;
    ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS country TEXT;
    ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS org TEXT;

    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      name TEXT,
      email TEXT,
      role TEXT,
      challenge TEXT,
      ip TEXT
    );
  `).then(() => {
    console.log('✅ PostgreSQL Analytics & B2B Firmographic Tables Initialized on Railway for Berlin AI Labs');
  }).catch(err => {
    console.error('❌ PostgreSQL Initialization Error:', err);
  });
}

// B2B Reverse IP Lookup (Firmographics)
function lookupB2BCompany(ip) {
  return new Promise((resolve) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
      return resolve({ company: 'Internal / Direct', city: 'Local', country: 'Dev', org: 'Localhost' });
    }

    const apiUrl = `http://ip-api.com/json/${ip}?fields=status,country,city,org,as,isp`;
    http.get(apiUrl, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.status === 'success') {
            resolve({
              company: data.org || data.isp || 'Individual / Unspecified',
              city: data.city || 'Unknown',
              country: data.country || 'Unknown',
              org: data.as || data.org || data.isp || 'Unknown'
            });
          } else {
            resolve({ company: 'Public IP', city: 'Unknown', country: 'Unknown', org: 'Standard ISP' });
          }
        } catch (e) {
          resolve({ company: 'Unknown', city: 'Unknown', country: 'Unknown', org: 'Unknown' });
        }
      });
    }).on('error', () => {
      resolve({ company: 'Unknown', city: 'Unknown', country: 'Unknown', org: 'Unknown' });
    });
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

// Helper: Send email notification via Resend API over HTTPS
async function sendNotificationEmail(lead) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL ALERT SIMULATION] New Lead from ${lead.name} (${lead.email}).`);
    return;
  }

  try {
    const payload = JSON.stringify({
      from: 'Berlin AI Labs <onboarding@resend.dev>',
      to: [NOTIFY_EMAIL],
      subject: `🚨 New Berlin AI Labs Lead: ${lead.name} (${lead.role || 'Inquiry'})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #111;">
          <h2>🚨 New Berlin AI Labs Client Request</h2>
          <p><strong>Name:</strong> ${lead.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${lead.email}">${lead.email}</a></p>
          <p><strong>Role / Interest:</strong> ${lead.role || 'General Inquiry'}</p>
          <p><strong>Challenge / Project Description:</strong></p>
          <blockquote style="background: #f4f4f5; padding: 14px; border-left: 4px solid #0055ff; font-size: 1.05em;">${lead.challenge}</blockquote>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.85em; color: #666;"><strong>Timestamp:</strong> ${lead.timestamp}<br/><strong>IP Address:</strong> ${lead.ip}</p>
        </div>
      `
    });

    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    });

    req.on('response', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[RESEND EMAIL SENT] Status: ${res.statusCode} | Response:`, data);
      });
    });

    req.on('error', (err) => {
      console.error('[RESEND EMAIL ERROR]:', err);
    });

    req.write(payload);
    req.end();
  } catch (err) {
    console.error('Failed to send email notification:', err);
  }
}

const server = http.createServer((req, res) => {
  const host = req.headers['host'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const parsedUrl = new URL(req.url, `http://${host}`);
  const pathname = parsedUrl.pathname;
  const ip = clientIp.split(',')[0].trim();

  // Server-Side B2B Visitor Event Logging into PostgreSQL
  if (!pathname.match(/\.(css|js|png|jpg|jpeg|webp|svg|ico)$/)) {
    if (dbPool) {
      lookupB2BCompany(ip).then(firmographics => {
        dbPool.query(
          `INSERT INTO visitor_logs (host, path, ip, company, city, country, org, referrer, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [host, pathname, ip, firmographics.company, firmographics.city, firmographics.country, firmographics.org, referrer, userAgent]
        ).then(() => {
          console.log(`[B2B LOG - Berlin AI] Visitor from ${firmographics.company} (${firmographics.city}, ${firmographics.country}) on ${pathname}`);
        }).catch(e => console.error('DB Visitor Log Error:', e.message));
      });
    }
  }

  // Handle Form Triage Submission (POST /api/triage) with 4-Layer Anti-Spam Shield
  if (pathname === '/api/triage' && req.method === 'POST') {
    // Layer 1: Strict Rate Limiting per IP (Max 3 submissions per 10 minutes)
    const now = Date.now();
    const limitInfo = triageRateLimits.get(ip) || { count: 0, resetTime: now + 10 * 60 * 1000 };
    if (now > limitInfo.resetTime) {
      limitInfo.count = 0;
      limitInfo.resetTime = now + 10 * 60 * 1000;
    }
    limitInfo.count += 1;
    triageRateLimits.set(ip, limitInfo);

    if (limitInfo.count > 3) {
      console.log(`[SPAM SHIELD - Berlin AI] Rate limit exceeded for IP ${ip}`);
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Too many requests. Please wait a few minutes.' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const lead = JSON.parse(body);
        lead.timestamp = new Date().toISOString();
        lead.ip = ip;

        // Layer 2: Honeypot Trap Detection (Hidden field filled out by bots)
        if (lead.website_url || lead.b_field || lead.phone_number_hp) {
          console.log(`[SPAM SHIELD BLOCKED - Berlin AI] Honeypot field filled by bot from IP ${ip}`);
          const fakeToken = crypto.randomBytes(16).toString('hex');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Triage request received.', redirectUrl: `/book-session?t=${fakeToken}` }));
          return;
        }

        // Layer 3: Time-Based Submission Check (Submissions faster than 2.5s are automated bots)
        if (lead.load_time && (now - Number(lead.load_time) < 2500)) {
          console.log(`[SPAM SHIELD BLOCKED - Berlin AI] Bot submission too fast (${now - Number(lead.load_time)}ms) from IP ${ip}`);
          const fakeToken = crypto.randomBytes(16).toString('hex');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Triage request received.', redirectUrl: `/book-session?t=${fakeToken}` }));
          return;
        }

        // Layer 4: Email & Input Validation
        if (!lead.email || !lead.email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid email address.' }));
          return;
        }

        const emailParts = lead.email.trim().toLowerCase().split('@');
        const emailUser = emailParts[0];
        const emailDomain = emailParts[1];

        // Block Disposable Domains
        if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
          console.log(`[SPAM SHIELD BLOCKED - Berlin AI] Disposable email domain ${emailDomain} from IP ${ip}`);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Please use a valid personal or corporate email address.' }));
          return;
        }

        // Block Dot-Stuffed Gmail Spam Aliases (e.g. pr.an.a.bh.ue.code1@gmail.com has 5 dots)
        const dotCount = (emailUser.match(/\./g) || []).length;
        if (emailDomain.includes('gmail') && dotCount >= 3) {
          console.log(`[SPAM SHIELD BLOCKED - Berlin AI] Dot-stuffed Gmail alias ${lead.email} from IP ${ip}`);
          const fakeToken = crypto.randomBytes(16).toString('hex');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Triage request received.', redirectUrl: `/book-session?t=${fakeToken}` }));
          return;
        }

        // Enforce Strict Minimum Text Length (Blank / 0-char challenge fields rejected)
        if (!lead.name || lead.name.trim().length < 2) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Please enter a valid name.' }));
          return;
        }

        if (!lead.challenge || lead.challenge.trim().length < 8) {
          console.log(`[SPAM SHIELD BLOCKED - Berlin AI] Empty or insufficient challenge text from ${lead.email}`);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Please describe your inquiry in at least 8 characters.' }));
          return;
        }

        console.log('🚨 VERIFIED LEGITIMATE BERLIN AI LABS LEAD CAPTURED:', lead);

        // Store Lead into PostgreSQL
        if (dbPool) {
          await dbPool.query(
            `INSERT INTO leads (name, email, role, challenge, ip) VALUES ($1, $2, $3, $4, $5)`,
            [lead.name, lead.email, lead.role || 'Client Inquiry', lead.challenge, lead.ip]
          ).catch(e => console.error('DB Lead Log Error:', e.message));
        }

        // Send Real-Time Email Notification via Resend HTTPS
        await sendNotificationEmail(lead);

        // Generate Ephemeral Single-Use Token for Server-Side Proxy Redirect
        const token = crypto.randomBytes(16).toString('hex');
        ephemeralBookingTokens.set(token, { name: lead.name, email: lead.email, created: Date.now() });

        // Expire tokens older than 15 minutes
        for (const [t, data] of ephemeralBookingTokens.entries()) {
          if (Date.now() - data.created > 15 * 60 * 1000) ephemeralBookingTokens.delete(t);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Triage request received.',
          redirectUrl: `/book-session?t=${token}` 
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Secure Server-Side Proxy Booking Gateway (GET /book-session?t=TOKEN)
  if (pathname === '/book-session') {
    const token = parsedUrl.searchParams.get('t');
    const tokenData = ephemeralBookingTokens.get(token);

    if (tokenData) {
      ephemeralBookingTokens.delete(token); // Single-use consumption
      const destination = `${CALENDLY_URL}?name=${encodeURIComponent(tokenData.name)}&email=${encodeURIComponent(tokenData.email)}`;
      res.writeHead(302, { 'Location': destination });
      res.end();
      return;
    } else {
      // Fallback if token missing or consumed
      res.writeHead(302, { 'Location': CALENDLY_URL });
      res.end();
      return;
    }
  }

  // Static File Serving & Clean Path Routing
  let filePath = path.join(__dirname, 'index.html');
  if (pathname !== '/') {
    let cleanPath = pathname;
    if (!path.extname(pathname)) {
      cleanPath = pathname + '.html';
    }
    const potentialPath = path.join(__dirname, cleanPath);
    if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
      filePath = potentialPath;
    } else {
      const rawPath = path.join(__dirname, pathname);
      if (fs.existsSync(rawPath) && fs.statSync(rawPath).isFile()) {
        filePath = rawPath;
      }
    }
  }

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'text/html; charset=UTF-8';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${err.code}`);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Berlin AI Labs server running on port ${PORT}`);
});
