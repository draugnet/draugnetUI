// metadata.js

/**
 * Load the shared metadata fragment and wire up sharing-group logic.
 */
async function loadMetadata() {
    // 1) insert HTML
    const resp = await fetch('metadata.html', { cache: 'no-cache' });
    const frag = await resp.text();
    document.getElementById('metadata-container').innerHTML = frag;
  
    // 2) prepare elements
    const distEl       = document.getElementById('meta-distribution');
    const sgContainer  = document.getElementById('meta-sharing-group-container');
    const sgSelect     = document.getElementById('meta-sharing-group');
  
    // 3) fetch sharing groups
    let groups = [];
    try {
      const base = window.config?.baseurl || window.location.origin;
      const r = await fetch(`${base}/sharing_groups`);
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length) groups = data;
      }
    } catch {
      groups = [];
    }
  
    // 4) update distribution options
    if (!groups.length) {
      // remove option '4' if no groups available
      const opt4 = distEl.querySelector('option[value="4"]');
      if (opt4) opt4.remove();
    } else {
      // populate sharing-groups dropdown
      sgSelect.innerHTML = '';
      groups.forEach(g => {
        const o = document.createElement('option');
        o.value = g.id;
        o.textContent = g.name;
        sgSelect.appendChild(o);
      });
    }
  
    // 5) show/hide sharing-group select
    distEl.addEventListener('change', () => {
      sgContainer.style.display =
        distEl.value === '4' && groups.length ? 'block' : 'none';
    });
    // init
    distEl.dispatchEvent(new Event('change'));
  }
  
  /**
   * Returns an object with all metadata values.
   */
  export function getMetadata() {
    const title        = document.getElementById('meta-title').value.trim();
    const description  = document.getElementById('meta-description').value.trim();
    const distribution = Number(document.getElementById('meta-distribution').value);
    const meta = { title, description, distribution };
  
    if (distribution === 4) {
      meta.sharing_group_id = Number(
        document.getElementById('meta-sharing-group').value
      );
    }
    meta.tlp       = document.getElementById('meta-tlp').value;
    meta.pap       = document.getElementById('meta-pap').value;
    const subm     = document.getElementById('meta-submitter').value.trim();
    if (subm) meta.submitter = subm;
  
    return meta;
  }
  
    // auto‐load on pages that include #metadata-container
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('metadata-container');
        if (!container) return;
    
        // If a token query-param is present, skip metadata
        const token = new URLSearchParams(window.location.search).get('token');
        if (token) {
            container.remove();
        return;
    }
    
        // otherwise, load the metadata accordion as before
        loadMetadata();
    });
  
// ─── Expose to the global scope ─────────────────────────────────────────
window.getMetadata = getMetadata;