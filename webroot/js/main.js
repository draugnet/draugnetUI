// main.js

let baseUrl = '';

// ── Load config.json to get baseUrl ─────────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch('config/config.json');
    const cfg = await res.json();
    baseUrl = cfg.baseUrl || cfg.baseurl || window.location.origin;
  } catch (e) {
    console.warn('Could not load config.json; using window.location.origin');
    baseUrl = window.location.origin;
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
    rawEl.textContent = 'Error: missing ?token= parameter in URL';
    return;
  }

  try {
    // Fetch event data and timestamp in parallel
    const [evtRes, tsRes] = await Promise.all([
      fetch(`${baseUrl}/retrieve/${token}`),
      fetch(`${baseUrl}/timestamp/${token}`)
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
          <strong>Token:</strong> ${esc(token)}<br>
          <strong>Submitted:</strong> ${new Date(tsNum * 1000).toISOString()}<br>
          <small class="text-muted">(Unix: ${tsNum})</small>
        </div>
      </div>
    `;

    // Show raw JSON
    rawEl.innerHTML = highlightJSON(data);

    // Render visual tree, highlighting nodes newer than tsNum
    renderMISPEvent(evt, {
      treeContainer:  treeEl,
      panelContainer: overviewEl,
      highlightAfter: tsNum
    });

    // Wire up Download button
    document.getElementById('download-json').onclick = () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${token}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

  } catch (err) {
    rawEl.textContent = `Failed to load report: ${err}`;
  }
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
  });


function showToast(message, success = true) {
    const toastEl = document.getElementById("toast");
    document.getElementById("toast-body").innerText = message;
    toastEl.classList.remove("bg-success", "bg-danger");
    toastEl.classList.add(success ? "bg-success" : "bg-danger");
    new bootstrap.Toast(toastEl).show();
}