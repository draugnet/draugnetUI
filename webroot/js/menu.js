// ─── Update menu logo to match current theme ─────────────────────────────────
function updateMenuLogo() {
    const img = document.getElementById('logo-img');
    if (!img) return;
    const theme = document.documentElement.getAttribute('data-bs-theme');
    img.src = theme === 'dark'
        ? (img.dataset.logoDark  || img.src)
        : (img.dataset.logoLight || img.src);
}

// ─── Theme setup ──────────────────────────────────────────────────────────────
function setupTheme() {
    const saved  = localStorage.getItem('preferred-theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', saved);

    const toggle = document.getElementById('theme-toggle');
    const icon   = document.getElementById('theme-icon');

    // Set initial icon
    if (icon) icon.className = saved === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    updateMenuLogo();

    if (toggle) {
        toggle.addEventListener('click', () => {
            const current  = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('preferred-theme', newTheme);
            if (icon) icon.className = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            updateMenuLogo();
            updateIndexLogo();  // updates hero logo on index.html if present
        });
    }
}

// ─── Load shared menu, highlight active page ──────────────────────────────────
async function loadMenu() {
    const res = await fetch('menu.html', { cache: 'no-cache' });
    if (!res.ok) return;
    const html = await res.text();
    document.getElementById('menu-container').innerHTML = html;

    setupTheme();

    const currentPage  = document.body.getAttribute('data-page');
    const reportPages  = ['object', 'misp', 'freetext', 'stix', 'csv'];

    // Mark matching link/item as active
    document.querySelectorAll('#menu-container [data-page]').forEach(el => {
        const page = el.getAttribute('data-page');
        el.classList.toggle('active', page === currentPage);
    });

    // Also mark the Report dropdown toggle when on any report sub-page
    const reportToggle = document.getElementById('report-dropdown-toggle');
    if (reportToggle && reportPages.includes(currentPage)) {
        reportToggle.classList.add('active');
    }
}
