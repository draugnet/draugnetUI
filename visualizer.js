// visualizer.js
export function renderMISPEvent(event, {
    treeContainer,
    panelContainer = treeContainer,
    highlightAfter = 0
  }) {
    if (!event || !treeContainer) return;
  
    // ── HTML‐escaping helper ─────────────────────────────────────────────
    const esc = str => {
      const d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    };
  
    // ── Overview panel ──────────────────────────────────────────────────
    panelContainer.innerHTML = '';
    const overviewHtml = `
      <p><strong>ID:</strong> ${esc(String(event.id))}</p>
      <p><strong>UUID:</strong> ${esc(event.uuid)}</p>
      <p><strong>Date:</strong> ${esc(event.date)}</p>
      <p><strong>Info:</strong> ${esc(event.info)}</p>
      <p><strong>Threat Level:</strong> ${esc(String(event.threat_level_id))}</p>
    `;
    const panel = document.createElement('div');
    panel.className = 'card mb-3';
    panel.innerHTML = `<div class="card-header">Overview</div><div class="card-body">${overviewHtml}</div>`;
    panelContainer.appendChild(panel);
  
    // ── Type ordering for sorting ────────────────────────────────────────
    const typeOrder = {
      Tag:         1,
      Galaxy:      2,
      Attribute:   3,
      Note:        4,
      Opinion:     5,
      Object:      6,
      Relationship:7
    };
    const prioritize = nodes =>
      nodes.sort((a,b) => (typeOrder[a.meta.type]||99) - (typeOrder[b.meta.type]||99));
  
    // ── Recursive node‐builder ──────────────────────────────────────────
    function buildNode(item, type) {
      const meta = { type, ...item };
      // determine display name
      const name = esc(
        item.name
        ?? item.value
        ?? item.uuid
        ?? item.relationship_type
        ?? ''
      );
  
      // collect children of all supported kinds
      let children = [];
  
      // If this item has sub-Objects:
      if (item.Object) {
        item.Object.forEach(o => children.push(buildNode(o, 'Object')));
      }
      // If it has Attributes:
      if (item.Attribute) {
        item.Attribute.forEach(a => children.push(buildNode(a, 'Attribute')));
      }
      // If it has Tags:
      if (item.Tag) {
        item.Tag.forEach(t => children.push(buildNode(t, 'Tag')));
      }
      // If it has GalaxyClusters (nested under Galaxy):
      if (item.GalaxyCluster) {
        item.GalaxyCluster.forEach(g => children.push(buildNode(g, 'Galaxy')));
      }
      // If it has standalone Galaxy entries (event.Galaxy):
      if (item.Galaxy && Array.isArray(item.Galaxy)) {
        item.Galaxy.flatMap(g => g.GalaxyCluster || []).forEach(g => children.push(buildNode(g, 'Galaxy')));
      }
      // Now Notes, Opinions, Relationships—*wherever* they appear:
      ['Note', 'Opinion', 'Relationship'].forEach(key => {
        if (item[key]) {
          item[key].forEach(x => children.push(buildNode(x, key)));
        }
      });
  
      // sort siblings by your preferred order
      prioritize(children);
  
      return { name, meta, children };
    }
  
    // ── Render a single <li> with tooltip & collapse logic ─────────────
    function createNode(node) {
        const li = document.createElement('li');
        const toggle = document.createElement('span');
        toggle.className = 'toggle';
        if (node.children.length) {
          toggle.addEventListener('click', () => li.classList.toggle('collapsed'));
        } else {
          toggle.style.visibility = 'hidden';
        }
      
        const card = document.createElement('div');
        card.className = 'node-card card d-inline-flex align-items-center flex-nowrap';
      
        // ⏱ Highlight newer-than-submission nodes
        // ── Compute node timestamp ─────────────────────────────────────────
        let ts = NaN;

        if (node.meta.timestamp) {
            // explicit UNIX‐seconds field
            ts = Number(node.meta.timestamp);
        } else if (node.meta.created) {
            // parse the "created" string as local‐server time,
            // then add the server's timezone offset in seconds
            const date = new Date(node.meta.created);
            ts = Math.floor(date.getTime() / 1000);

            // determine server TZ (e.g. "Europe/Berlin") from your loaded config
            const tz = window.config?.timezone
            || Intl.DateTimeFormat().resolvedOptions().timeZone;

            // compute offset in seconds for that TZ at this date
            const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'short'
            });
            const parts = fmt.formatToParts(date);
            const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
            const m = tzPart.match(/([+-]\d{1,2})(?::?(\d{2}))?/);
            if (m) {
            const hours   = Number(m[1]);
            const minutes = m[2] ? Number(m[2]) : 0;
            ts += hours * 3600 + minutes * 60;
            }
        }

        if (!isNaN(ts) && ((ts) > highlightAfter)) {
          card.classList.add('highlight');
        } else {
          card.classList.remove('highlight');
        }
      
        const badge = Object.assign(document.createElement('span'), {
          className: 'badge bg-primary badge-type',
          textContent: node.meta.type
        });
        const text = Object.assign(document.createElement('span'), {
          textContent: node.name,
          style: 'margin-left:4px;'
        });
      
        const tip = document.createElement('div');
        tip.className = 'tooltip-popup';
        tip.innerHTML = Object.entries(node.meta)
          .map(([k,v]) => `<div><strong>${esc(k)}</strong>: ${esc(String(v))}</div>`)
          .join('');
      
        card.append(badge, text, tip);
        li.append(toggle, card);
      
        if (node.children.length) {
          const ul = document.createElement('ul');
          ul.className = 'tree';
          node.children.forEach(c => ul.appendChild(createNode(c)));
          li.append(ul);
        }
        return li;
      }
      
  
    // ── Kick off rendering ───────────────────────────────────────────────
    const rootNode = buildNode(event, 'Event');
    const treeRoot = document.createElement('ul');
    treeRoot.className = 'tree';
    treeRoot.appendChild(createNode(rootNode));
  
    treeContainer.innerHTML = '';
    treeContainer.appendChild(treeRoot);
  }
  