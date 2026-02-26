// main.js

let baseUrl = '';

// ── Load config.json to get baseUrl ─────────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch('config/config.json');
    const cfg = await res.json();
    const candidate = cfg.baseUrl || cfg.baseurl || '';
    if (candidate) {
      try {
        const u = new URL(candidate);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
        baseUrl = candidate.replace(/\/$/, ''); // strip trailing slash
      } catch {
        console.warn('Invalid baseUrl in config.json; falling back to window.location.origin');
        baseUrl = window.location.origin;
      }
    } else {
      baseUrl = window.location.origin;
    }
  } catch (e) {
    console.warn('Could not load config.json; using window.location.origin');
    baseUrl = window.location.origin;
  }
  apilink = document.getElementById('api-link');
  if (apilink != 'undefined' && apilink !== null) {
    apilink.innerHTML = `<a href="${esc(baseUrl)}">${esc(baseUrl)}</a>`;
  }
  apidocslink = document.getElementById('api-docs-link');
  if (apidocslink != 'undefined' && apidocslink !== null) {
    apidocslink.innerHTML = `<a href="${esc(baseUrl)}/docs">OpenAPI spec</a>`;
  }
}

// ── HTML‐escape helper ───────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Syntax‐highlight raw JSON ───────────────────────────────────────
function highlightJSON(obj) {
  const json = JSON.stringify(obj, null, 2);
  return esc(json).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|\b[\d.]+\b)/g,
    m => {
      let cls = 'text-primary';
      if (/^"/.test(m))         cls = /:$/.test(m) ? 'text-warning' : 'text-success';
      else if (/true|false/.test(m)) cls = 'text-info';
      else if (/null/.test(m))       cls = 'text-muted';
      else if (/^\d+$/.test(m))      cls = 'text-danger';
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

// ── Load and render the report & visualization ──────────────────────
async function loadReport() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const rawEl  = document.getElementById('raw-json');
  const treeEl = document.getElementById('tree-container');
  const overviewEl = document.getElementById('event-overview');
  const infoEl = document.getElementById('report-info');

  if (!token) {
    rawEl.innerHTML = `
    <p>
      View your previously submitted reports by clicking on the appropriate token
      from the token store to the right.
    </p>
    `;
    
    return;
  }

  try {
    // Fetch event data and timestamp in parallel
    const [evtRes, tsRes] = await Promise.all([
      fetch(`${baseUrl}/retrieve?token=${token}`),
      fetch(`${baseUrl}/timestamp?token=${token}`)
    ]);

    if (!evtRes.ok) throw new Error(`retrieve failed: ${evtRes.status}`);
    if (!tsRes.ok)  throw new Error(`timestamp failed: ${tsRes.status}`);

    const data  = await evtRes.json();
    const tsNum = Number(await tsRes.json());

    // Normalize event object (handle array or direct structure)
    const evt = Array.isArray(data)
      ? data[0]?.Event
      : data.Event ?? data.event ?? data;

    // Populate token & timestamp info
    infoEl.innerHTML = `
      <div class="card mb-3">
        <div class="card-body">
          <strong>Token:</strong>
          <span class="copyable" data-copy-text="${esc(token)}">${esc(token)}</span><br>
          <strong>Submitted:</strong> ${new Date(tsNum * 1000).toISOString()}<br>
          <small class="text-muted">(Unix: ${tsNum})</small>
        </div>
      </div>
    `;

    // Show raw JSON
    rawEl.innerHTML = highlightJSON(data);
    rawEl.classList.add('copyable');
    rawEl.dataset.copyText = JSON.stringify(data, null, 2);

    // Render visual tree, highlighting nodes newer than tsNum
    renderMISPEvent(evt, {
      treeContainer:  treeEl,
      panelContainer: overviewEl,
      highlightAfter: tsNum
    });

  } catch (err) {
    rawEl.textContent = `Failed to load report: ${err}`;
  }
  attachClipboard('.copyable');
}

// ── Initialize Raw/Visual toggles ───────────────────────────────────
function initToggles() {
  const rawEl  = document.getElementById('raw-json');
  const treeEl = document.getElementById('tree-container');
  const overviewEl = document.getElementById('event-overview');

  document.getElementById('toggle-visual').onclick = () => {
    overviewEl.style.display = 'block';
    treeEl    .style.display = 'block';
    rawEl     .style.display = 'none';
  };

  document.getElementById('toggle-raw').onclick = () => {
    overviewEl.style.display = 'none';
    treeEl    .style.display = 'none';
    rawEl     .style.display = 'block';
  };

  // Default to raw JSON view
  overviewEl.style.display = 'none';
  treeEl    .style.display = 'none';
  rawEl     .style.display = 'block';
}

window.addEventListener("load", async () => {
    await loadConfig();
    await loadMenu();
    await loadTokenStore();
    if (document.getElementById('raw-json')) {
      initToggles();
      loadReport();
    }
    // grab ?token= from URL
    const params     = new URLSearchParams(window.location.search);
    const token      = params.get("token");

    // ── view.html only: if we don't have a Visual-toggle button, bail out ──
    const toggleVisualBtn = document.getElementById("toggle-visual");
    if (!toggleVisualBtn) return;

    const downloadAsLinks = document.querySelectorAll(
      '#download-as-btn + .dropdown-menu .dropdown-item'
    );
    downloadAsLinks.forEach(link => {
      link.addEventListener('click', async e => {
        e.preventDefault();
        const format = link.getAttribute('data-format');
        const token  = new URLSearchParams(window.location.search).get('token');
        if (!token) return;

        const base = baseUrl || window.location.origin;
        const url  = `${base}/retrieve?token=${encodeURIComponent(token)}&format=${encodeURIComponent(format)}`;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${token}.${format}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(blobUrl);
        } catch (err) {
          console.error('Download failed', err);
          showToast('Download failed.', false);
        }
      });
    });


    // wire up Add-buttons
    const addObjBtn  = document.getElementById("add-object");
    const addTextBtn = document.getElementById("add-freetext");
    const addMispBtn = document.getElementById("add-misp");
    if (token) {
      addObjBtn.style.display  = "inline-block";
      addObjBtn.onclick        = () => window.location = `object.html?token=${encodeURIComponent(token)}`;
      addTextBtn.style.display = "inline-block";
      addTextBtn.onclick       = () => window.location = `freetext.html?token=${encodeURIComponent(token)}`;
      addMispBtn.style.display = "inline-block";
      addMispBtn.onclick       = () => window.location = `misp.html?token=${encodeURIComponent(token)}`;
    }

    // With a token present, default to visual view
    if (token) {
      document.getElementById("toggle-visual").click();
    }
  });


function showToast(message, success = true) {
    const toastEl = document.getElementById("toast");
    document.getElementById("toast-body").innerText = message;
    toastEl.classList.remove("bg-success", "bg-danger");
    toastEl.classList.add(success ? "bg-success" : "bg-danger");
    new bootstrap.Toast(toastEl).show();
}

// Helper to set the index logo based on current theme
function updateIndexLogo() {
  const img = document.getElementById('index-draugnet-image');
  if (!img) return;
  const theme = document.documentElement.getAttribute('data-bs-theme');
  img.src = theme === 'dark'
    ? img.getAttribute('data-dark-src')
    : img.getAttribute('data-light-src');
}

// copyText: write to clipboard & show a toast
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch (err) {
    console.error('Copy failed', err);
    showToast('Copy failed.', false);
  }
}

// attachClipboard: wire up any element(s) matching a selector
// to copy either its data-copy-text or its textContent
function attachClipboard(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.style.cursor = 'pointer';
    el.setAttribute('title', 'Click to copy');
    el.addEventListener('click', () => {
      // Prefer data-copy-text, otherwise use visible text
      const txt = el.dataset.copyText ?? el.textContent.trim();
      copyText(txt);
    });
  });
}