(function () {
    'use strict';

    const SUPPORTED = ['en', 'fr'];
    const STORAGE_KEY = 'preferredLang';
    const root = document.documentElement;
    root.classList.add('js');

    /* ---------- Language ---------- */
    function storedLang() {
        try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    }
    function saveLang(lang) {
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
    }
    function detectLang() {
        const fromUrl = new URLSearchParams(window.location.search).get('lang');
        if (SUPPORTED.includes(fromUrl)) return fromUrl;
        const saved = storedLang();
        if (SUPPORTED.includes(saved)) return saved;
        const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
        return browser === 'fr' ? 'fr' : 'en';
    }

    let currentLang = 'en';
    const t = (key) => (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || '';

    function setLanguage(lang, persist) {
        if (!translations[lang]) return;
        currentLang = lang;
        const dict = translations[lang];

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const value = dict[el.dataset.i18n];
            if (value) el.textContent = value;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const value = dict[el.dataset.i18nPlaceholder];
            if (value) el.placeholder = value;
        });
        document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            const value = dict[el.dataset.i18nAlt];
            if (value) el.alt = value;
        });

        document.title = dict.meta_title;
        const desc = document.querySelector('meta[name="description"]');
        if (desc) desc.setAttribute('content', dict.meta_description);
        root.lang = lang;

        document.querySelectorAll('.lang-btn').forEach((btn) => {
            btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
        });
        document.querySelectorAll('[data-lang-link]').forEach((a) => {
            a.setAttribute('href', a.dataset.langLink + '?lang=' + lang);
        });
        if (persist) saveLang(lang);
    }

    setLanguage(detectLang(), false);

    document.querySelectorAll('.lang-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang, true);
            // Keep the URL shareable in the chosen language
            const url = new URL(window.location.href);
            url.searchParams.set('lang', btn.dataset.lang);
            history.replaceState(null, '', url);
        });
    });

    /* ---------- Mobile navigation ---------- */
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    function closeMenu() {
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
    }
    navToggle.addEventListener('click', () => {
        const open = navMenu.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
    });
    navMenu.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    /* ---------- Header border on scroll ---------- */
    const header = document.getElementById('siteHeader');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Reveal on scroll + active nav link ---------- */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('IntersectionObserver' in window) {
        if (!reduceMotion) {
            const revealObserver = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        obs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -60px 0px' });
            document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
        }

        const links = new Map();
        document.querySelectorAll('.nav-link').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                links.forEach((a) => a.classList.remove('active'));
                const link = links.get(entry.target.id);
                if (link) link.classList.add('active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        document.querySelectorAll('main section[id]').forEach((s) => sectionObserver.observe(s));
    }
    if (reduceMotion || !('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    }

    /* ---------- Contact form (FormSubmit AJAX) ---------- */
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    function showStatus(message, type) {
        status.textContent = message;
        status.className = 'form-status' + (type ? ' is-' + type : '');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Native validation, with invalid fields flagged for screen readers
        let firstInvalid = null;
        form.querySelectorAll('input[required], textarea[required]').forEach((field) => {
            const invalid = !field.checkValidity();
            field.setAttribute('aria-invalid', String(invalid));
            if (invalid && !firstInvalid) firstInvalid = field;
        });
        if (firstInvalid) { firstInvalid.reportValidity(); firstInvalid.focus(); return; }

        const data = Object.fromEntries(new FormData(form).entries());
        if (data._honey) return; // bot

        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        showStatus(t('form_sending'));

        fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data)
        })
            .then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); })
            .then(() => { showStatus(t('form_success'), 'success'); form.reset(); })
            .catch(() => showStatus(t('form_error'), 'error'))
            .finally(() => { button.disabled = false; });
    });

    /* ---------- Footer year ---------- */
    document.getElementById('year').textContent = new Date().getFullYear();
})();
