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
        updateIndexLogo();
        });
    }
}
    
// ─── Load shared menu & highlight “report-freetext” ───────────────────────
async function loadMenu() {
    const res = await fetch("menu.html", { cache: "no-cache" });
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

