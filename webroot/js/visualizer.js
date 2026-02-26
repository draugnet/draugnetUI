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
    var datetime = new Date((event.timestamp * 1000)).toISOString();
    const overviewHtml = `
        <p><strong>UUID:</strong> ${esc(event.uuid)}</p>
        <p><strong>Last modified:</strong> ${esc(datetime)}</p>    
    `;
    const panel = document.createElement('div');
    panel.className = 'card mb-3';
    panel.innerHTML = `<div class="card-header">${esc(event.info)}</div><div class="card-body">${overviewHtml}</div>`;
    //panelContainer.appendChild(panel);
  
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
    function buildNode(item, objecttype) {
      const meta = { objecttype, ...item };
      // determine display name
      const primaryFields = {
        "Event": 'info',
        "Attribute": ['value'],
        "Object": 'name',
        "Tag": 'name',
        "Galaxy": 'value',
        "GalaxyCluster": 'name',
        "Note": 'note',
        "Opinion": 'comment',
        "Relationship": 'relationship_type'
      };
      const name = item[primaryFields[objecttype]];
  
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

        const type_explanations = {
            Event: 'A generic container, containing all other contextually linked objects.',
            Attribute: 'An atomic data point, describing a single data-point/IoC with some metadata. Example: ip-dst:8.8.8.8, domain:starcraft2.com, sha256:1a9df47...',
            Object: 'A composite data structure, grouping multiple Attributes together based on rules defined by object templates.',
            Tag: 'A string label, most often derived from a taxonomy in machine-tag format (namespace:predicate="value").',
            Galaxy: 'A high-level knowledge-base concept used as a label, expressed via clusters. Example: Threat-actor:APT-29.',
            GalaxyCluster: 'An individual cluster within a Galaxy, containing key-value pairs describing a specific concept.',
            Note: 'An analyst note attached by a user to an element.',
            Opinion: 'An analyst opinion attached by a user to an element, expressing a subjective view on the data.',
            Relationship: 'An arbitrarily encoded relationship between two data points.'
        };

        // ── Row ───────────────────────────────────────────────────────────
        const row = document.createElement('div');
        row.className = 'tree-row';

        // ── Compute timestamp & apply highlight ───────────────────────────
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
        if (!isNaN(ts) && ts > highlightAfter && node.meta.objecttype !== 'Event') {
            row.classList.add('highlight');
        }

        // ── Collapse toggle (Font Awesome chevron) ────────────────────────
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle' + (node.children.length ? '' : ' no-children');
        toggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        if (node.children.length) {
            toggle.addEventListener('click', () => li.classList.toggle('collapsed'));
        }
        row.appendChild(toggle);

        // ── Type pill ─────────────────────────────────────────────────────
        const type = node.meta.objecttype;
        const pill = document.createElement('span');
        let pillText = type.toLowerCase();
        if      (type === 'Attribute')    pillText = node.meta.type || 'attr';
        else if (type === 'Object')       pillText = node.meta.name || 'obj';
        else if (type === 'Galaxy')       pillText = node.meta.type || 'galaxy';
        else if (type === 'Relationship') pillText = 'rel';
        pill.className = `tree-type-pill tree-type-${type}`;
        pill.textContent = pillText;
        pill.title = type_explanations[type] || type;
        row.appendChild(pill);

        // ── Label ─────────────────────────────────────────────────────────
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.name || '';
        row.appendChild(label);

        // ── Tooltip ───────────────────────────────────────────────────────
        const filteredEntries = filter_entries(node.meta);
        if (Object.keys(filteredEntries).length) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tree-tooltip';
            tooltip.innerHTML = Object.entries(filteredEntries)
                .map(([k, v]) => `
                    <div class="tree-tooltip-row">
                        <span class="tree-tooltip-key">${esc(k)}</span>
                        <span class="tree-tooltip-val">${esc(String(v))}</span>
                    </div>`)
                .join('');
            row.appendChild(tooltip);
        }

        li.appendChild(row);

        // ── Recursively append children ───────────────────────────────────
        if (node.children.length) {
            const ul = document.createElement('ul');
            ul.className = 'tree';
            node.children.forEach(child => ul.appendChild(createNode(child)));
            li.appendChild(ul);
        }

        return li;
    }

      function filter_entries(meta) {
        fieldsToKeep = {
            'Attribute': ['value', 'type', 'category', 'timestamp', 'to_ids', 'comment', 'object_relationship'],
            'Event': ['info', 'uuid', 'timestamp', 'published', 'date', 'published', 'distribution'],
            'Object': ['name', 'meta-category', 'timestamp', 'description', 'comment'],
            'Tag': ['name', 'colour', 'numerical_value'],
            'Galaxy': ['value', 'uuid', 'type', 'source', 'authors', 'description'],
            'GalaxyCluster': ['name', 'value', 'comment'],
            'Note': ['note', 'authors', 'orgc_uuid', 'created', 'modified'],
            'Opinion': ['comment', 'opinion', 'authors', 'orgc_uuid', 'created', 'modified'],
            'Relationship': ['relationship_type', 'source', 'destination']
        };
        // Filter out keys that are not needed in the tooltip
        const filtered = {};
        for (const [key, value] of Object.entries(meta)) {
            if (fieldsToKeep[meta.objecttype].includes(key)) {
              filtered[key] = value;
            }
        }
        return filtered;
      }
      
  
    // ── Kick off rendering ───────────────────────────────────────────────
    const rootNode = buildNode(event, 'Event');
    const treeRoot = document.createElement('ul');
    treeRoot.className = 'tree';
    treeRoot.appendChild(createNode(rootNode));
  
    treeContainer.innerHTML = '';
    treeContainer.appendChild(treeRoot);
  }
  