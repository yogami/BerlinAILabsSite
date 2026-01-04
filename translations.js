// Berlin AI Labs - Translation System
// DE/EN toggle with localStorage persistence

const translations = {
    de: {
        // Hero
        'hero.badge': 'DSGVO-konform • EU AI Act Ready • Made in Berlin',
        'hero.title1': 'KI-Reels für Berliner Unternehmen',
        'hero.title2': '— in Sekunden',
        'hero.subtitle': 'Automatisierte Promo-Videos. Guardian-geprüfte Compliance. Zero Retention. Von der URL zum fertigen Reel in unter 2 Minuten.',
        'hero.cta': 'Kostenlosen Reel testen',
        'hero.hint': 'Keine Anmeldung • Sofort-Vorschau • 100% DSGVO-sicher',

        // Stats
        'stats.latency': 'Compliance Check',
        'stats.retention': 'Data Retention',
        'stats.gdpr': 'DSGVO-Konform',
        'stats.origin': 'Made in Germany',

        // Trust
        'trust.message': 'Suchen Sie strategische Partnerschaften oder Fördermöglichkeiten?',
        'trust.cta': 'Kontakt für Partner',

        // Navigation
        'nav.products': 'Produkte',
        'nav.services': 'Services',
        'nav.about': 'Über uns',
        'nav.blog': 'Blog',
        'nav.contact': 'Kontakt',
        'nav.cta': 'Partner werden'
    },
    en: {
        // Hero
        'hero.badge': 'GDPR-compliant • EU AI Act Ready • Made in Berlin',
        'hero.title1': 'AI Reels for Berlin Businesses',
        'hero.title2': '— in Seconds',
        'hero.subtitle': 'Automated promo videos. Guardian-verified compliance. Zero Retention. From URL to finished reel in under 2 minutes.',
        'hero.cta': 'Try Free Reel',
        'hero.hint': 'No signup • Instant preview • 100% GDPR-safe',

        // Stats
        'stats.latency': 'Compliance Check',
        'stats.retention': 'Data Retention',
        'stats.gdpr': 'GDPR-Compliant',
        'stats.origin': 'Made in Germany',

        // Trust
        'trust.message': 'Looking for strategic partnerships or funding opportunities?',
        'trust.cta': 'Contact for Partnership',

        // Navigation
        'nav.products': 'Products',
        'nav.services': 'Services',
        'nav.about': 'About',
        'nav.blog': 'Blog',
        'nav.contact': 'Contact',
        'nav.cta': 'Partner with Us'
    }
};

class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('lang') || 'de';
        this.init();
    }

    init() {
        this.applyTranslations();
        this.bindToggle();
        this.updateToggleUI();
    }

    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[this.currentLang] && translations[this.currentLang][key]) {
                el.textContent = translations[this.currentLang][key];
            }
        });
        document.documentElement.lang = this.currentLang;
    }

    bindToggle() {
        const toggle = document.getElementById('lang-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                this.currentLang = this.currentLang === 'de' ? 'en' : 'de';
                localStorage.setItem('lang', this.currentLang);
                this.applyTranslations();
                this.updateToggleUI();
            });
        }
    }

    updateToggleUI() {
        const toggle = document.getElementById('lang-toggle');
        if (toggle) {
            toggle.textContent = this.currentLang === 'de' ? 'EN' : 'DE';
            toggle.setAttribute('aria-label',
                this.currentLang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'
            );
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new LanguageManager();
});
