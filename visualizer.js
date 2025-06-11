// visualizer.js
function renderMISPEvent(event, {
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
      console.log(type);
      const primaryFields = {
        "Event": 'info',
        "Attribute": 'value',
        "Object": 'name',
        "Tag": 'name',
        "Galaxy": 'name',
        "GalaxyCluster": 'name',
        "Note": 'note',
        "Opinion": 'comment',
        "Relationship": 'relationship_type'
      };
      const name = item[primaryFields[type]];
  
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
    
    function createNode(node) {
        const li = document.createElement('li');
      
        // Collapse toggle
        const toggle = document.createElement('span');
        toggle.className = 'toggle';
        if (node.children.length) {
          toggle.addEventListener('click', () => li.classList.toggle('collapsed'));
        } else {
          toggle.style.visibility = 'hidden';
        }
        li.append(toggle);
      
        // Card container
        const card = document.createElement('div');
        card.className = 'node-card card mb-2';
      
        // ── Compute node timestamp & apply highlight ────────────────────────
        let ts = NaN;
        if (node.meta.timestamp) {
          ts = Number(node.meta.timestamp);
        } else if (node.meta.created) {
          const date = new Date(node.meta.created);
          ts = Math.floor(date.getTime() / 1000);
          const tz = window.config?.timezone
            || Intl.DateTimeFormat().resolvedOptions().timeZone;
          const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'short'
          });
          const part = fmt.formatToParts(date).find(p => p.type === 'timeZoneName')?.value || '';
          const m = part.match(/([+-]\d{1,2})(?::?(\d{2}))?/);
          if (m) {
            const hours = Number(m[1]);
            const mins  = m[2] ? Number(m[2]) : 0;
            ts += hours * 3600 + mins * 60;
          }
        }
        if (!isNaN(ts) && ts > highlightAfter) {
          card.classList.add('highlight');
        }
      
        // ── Build content with Bootstrap grid ───────────────────────────────
        const row = document.createElement('div');
        row.className = 'row gx-2 align-items-center';
      
        // Badge column
        const badgeCol = document.createElement('div');
        badgeCol.className = 'col-auto';
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary badge-type';
        badge.textContent = node.meta.type;
        badgeCol.appendChild(badge);
        row.appendChild(badgeCol);
      
        // Text column
        const textCol = document.createElement('div');
        textCol.className = 'col';
        const text = document.createElement('span');
        text.textContent = node.name;
        textCol.appendChild(text);
        row.appendChild(textCol);
      
        // Tooltip column
        const tipCol = document.createElement('div');
        tipCol.className = 'col-auto position-relative';
        const tip = document.createElement('div');
        tip.className = 'tooltip-popup';
        tip.innerHTML = Object.entries(node.meta)
          .map(([k, v]) => `<div><strong>${esc(k)}</strong>: ${esc(String(v))}</div>`)
          .join('');
        tipCol.appendChild(tip);
        row.appendChild(tipCol);
      
        card.appendChild(row);
        li.appendChild(card);
      
        // ── Recursively append children ────────────────────────────────────
        if (node.children.length) {
          const ul = document.createElement('ul');
          ul.className = 'tree';
          node.children.forEach(child => ul.appendChild(createNode(child)));
          li.appendChild(ul);
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
  