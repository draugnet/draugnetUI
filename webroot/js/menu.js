// ─── Theme setup ─────────────────────────────────────────────────────────
function setupTheme() {
    const saved = localStorage.getItem("preferred-theme") || "dark";
    document.documentElement.setAttribute("data-bs-theme", saved);

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
        toggle.checked = saved === "dark";
        toggle.addEventListener("change", () => {
        const newTheme = toggle.checked ? "dark" : "light";
        document.documentElement.setAttribute("data-bs-theme", newTheme);
        localStorage.setItem("preferred-theme", newTheme);
        });
    }
}
    
// ─── Load shared menu & highlight “report-freetext” ───────────────────────
async function loadMenu() {
    const res = await fetch("menu.html");
    if (!res.ok) return;
    const html = await res.text();
    document.getElementById("menu-container").innerHTML = html;

    // Apply saved theme and wire toggle
    setupTheme();
    const current_page = document.body.getAttribute('data-page');
    document
        .querySelectorAll("#menu-container .nav-link")
        .forEach((link) => {
        const page = link.getAttribute("data-page");
        link.classList.toggle("active", page === current_page);
        });
    }


function updateLogo() {
    const htmlEl = document.documentElement;
    // determine current theme: 'dark' or 'light'
    const isDark = htmlEl.getAttribute('data-bs-theme') === 'dark';
    const img   = document.getElementById('logo-img');
    if (!img) return;
    // pick the right data-attr
    img.src = isDark
        ? img.getAttribute('data-logo-dark')
        : img.getAttribute('data-logo-light');
    }
    
function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    // read saved preference
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', saved);
    toggle.checked = (saved === 'dark');
    updateLogo();
    
    toggle.addEventListener('change', () => {
        const theme = toggle.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        updateLogo();
    });
}
