document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');

            // Toggle hamburger animation
            const bars = navToggle.querySelectorAll('.bar');
            if (navToggle.classList.contains('active')) {
                bars[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });
    }

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            // Reset hamburger
            const bars = navToggle.querySelectorAll('.bar');
            if (bars.length > 0) {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });
    });

    // 2. Scroll Reveal Animation
    // Elements with class 'reveal' will fade in when scrolled into view
    const revealElements = document.querySelectorAll('.reveal, .service-card, .case-card, .section-title, .about-content, .contact-content');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // 3. Counter Animation
    // Looks for elements with .stat-number and animates them
    const stats = document.querySelectorAll('.stat-number');

    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const value = target.textContent;
                // Only animate if it looks like a number (remove non-digits for parsing)
                const endValue = parseInt(value.replace(/\D/g, ''));

                if (!isNaN(endValue)) {
                    animateValue(target, 0, endValue, 2000, value);
                    countObserver.unobserve(target);
                }
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => countObserver.observe(stat));

    function animateValue(obj, start, end, duration, originalString) {
        let startTimestamp = null;
        // Determine prefix/suffix from original string
        const prefix = originalString.match(/^[^\d]*/) ? originalString.match(/^[^\d]*/)[0] : '';
        const suffix = originalString.match(/[^\d]*$/) ? originalString.match(/[^\d]*$/)[0] : '';

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const currentVal = Math.floor(progress * (end - start) + start);
            obj.innerHTML = prefix + currentVal + suffix;

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = originalString; // Ensure exact final value
            }
        };
        window.requestAnimationFrame(step);
    }

    // 4. 3D Tilt Effect for Cards (Premium Interaction)
    const cards = document.querySelectorAll('.service-card, .case-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });

    // 5. Navbar Glass Effect on Scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(2, 6, 23, 0.9)';
            nav.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.5)';
        } else {
            nav.style.background = 'rgba(2, 6, 23, 0.5)';
            nav.style.boxShadow = 'none';
        }
    });
});

// Utility: Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1e293b;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        transform: translateY(100px);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;

    // Add icon based on type
    const icon = type === 'success' ? '✓' : 'ℹ';
    notification.innerHTML = `<span style="color: ${type === 'success' ? '#10b981' : '#3b82f6'}">${icon}</span> ${message}`;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
    }, 100);

    // Remove after 3s
    setTimeout(() => {
        notification.style.transform = 'translateY(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// External integrations
function openCalendly() {
    // Open Calendly in new window
    window.open('https://calendly.com/berlin-ai-labs', '_blank');
}
