#!/usr/bin/env python3
"""
Berlin AI Labs End-to-End Simulation Script
Executes real HTTP traffic, B2B IP firmographic tracking, and form lead submissions against Railway deployment
"""

import urllib.request
import urllib.parse
import json
import time

BASE_URL = "https://web-production-ed9f1.up.railway.app"

# 1. Simulated Traffic
traffic_scenarios = [
    {
        "name": "Visitor 1 (LinkedIn Lead on Mac - Viewing AI Compliance)",
        "path": "/ai-compliance",
        "referrer": "https://www.linkedin.com/in/yogami",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    },
    {
        "name": "Visitor 2 (Direct Traffic - Browsing Agent Trust Protocol)",
        "path": "/AgentTrustProtocol",
        "referrer": "direct",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
    },
    {
        "name": "Visitor 3 (Google Organic Traffic - Viewing Tools)",
        "path": "/tools",
        "referrer": "https://www.google.com/search?q=eu+ai+act+compliance+tools",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    }
]

# 2. Simulated Form Submissions
berlinai_clients = [
    {
        "name": "TEST_Dr_Henrik_Baumann",
        "email": "h.baumann@fintech-berlin.de",
        "role": "CTO / Tech Founder",
        "challenge": "Deploying automated AI compliance guardrails for EU AI Act regulatory auditing."
    },
    {
        "name": "TEST_Claire_Dubois",
        "email": "claire.dubois@health-ai.fr",
        "role": "Head of AI Governance",
        "challenge": "Audit and validation of LLM outputs against strict EU MDR compliance frameworks."
    },
    {
        "name": "TEST_Viktor_Kovac",
        "email": "viktor.k@cloud-ops.io",
        "role": "VP of Product",
        "challenge": "Automating internal AI agent accountability, audit logging, and automated verification."
    }
]

def run_simulation():
    print("=== BERLIN AI LABS: STEP 1 - SIMULATING VISITOR TRAFFIC ===")
    for scenario in traffic_scenarios:
        req = urllib.request.Request(
            f"{BASE_URL}{scenario['path']}",
            headers={
                "User-Agent": scenario["user_agent"],
                "Referer": scenario["referrer"]
            }
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"✓ {scenario['name']} -> HTTP {resp.status}")
        except Exception as e:
            print(f"X {scenario['name']} -> Failed: {e}")
        time.sleep(1)

    print("\n=== BERLIN AI LABS: STEP 2 - SUBMITTING CLIENT INTAKE REQUESTS ===")
    for client in berlinai_clients:
        data = json.dumps(client).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/triage",
            data=data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) WebBrowser/BerlinAISim"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                res_body = json.loads(resp.read().decode("utf-8"))
                proxy_token = res_body.get("redirectUrl")
                print(f"✓ Submitted {client['name']} ({client['role']})")
                print(f"   -> Response: {res_body.get('message')}")
                print(f"   -> Returned Ephemeral Proxy Token URL: {proxy_token}")

                # Test Single-Use Booking Redirect Gateway
                proxy_req = urllib.request.Request(
                    f"{BASE_URL}{proxy_token}",
                    headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
                )

                class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
                    def redirect_request(self, req, fp, code, msg, headers, newurl):
                        return None

                opener = urllib.request.build_opener(NoRedirectHandler)
                try:
                    proxy_resp = opener.open(proxy_req)
                    location = proxy_resp.headers.get("Location")
                    print(f"   -> HTTP 302 Gateway Redirect Location: {location[:80]}...")
                except urllib.error.HTTPError as he:
                    if he.code == 302:
                        location = he.headers.get("Location")
                        print(f"   -> HTTP 302 Gateway Redirect Location: {location[:85]}...")
                    else:
                        print(f"   -> Gateway Error: {he}")

        except Exception as e:
            print(f"X Failed {client['name']}: {e}")
        time.sleep(2)

if __name__ == "__main__":
    run_simulation()
    print("\n=== BERLIN AI LABS SIMULATION COMPLETE ===")
