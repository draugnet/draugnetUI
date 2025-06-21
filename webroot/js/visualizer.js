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
            Attribute: 'An atomic data point, describing a single data-point/IoC with some metadata. Example: ip-dst:8.8.8.8, domain:starcraft2.com, sha256:1a9df47956c64a2302ad765aeefbb2a6e2bbcc30a47762733662b4c6c7796e2c.',
            Object: 'A composite data structure, grouping multiple Attributes together based on rules defined by object templates. In most cases they allow to describe multiple aspects of concepts such as files, emails, etc.',
            Tag: 'A string label, most often derived from a taxonomy in machine-tag format (such namespace:predicate="value")',
            Galaxy: 'Galaxies are more complex knowledge base items that can be used as labelling. Galaxies are high level concepts, expressed via individual galaxy clusters. Each cluster will have a list of key values expressing the known/shared information associated with it. Example: Threat-actor:APT-29.',
            GalaxyCluster: 'An individual cluster within a Galaxy, containing key-value pairs that describe a specific aspect of the Galaxy cluster.',
            Note: 'An analyst note attached by a user to an element.',
            Opinion: 'An analyst opinion attached by a user to an element, expressing a subjective view on the data.',
            Relationship: 'An arbitrarily encoded relationship between two data points.'
        }
      
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
        if (!isNaN(ts) && ts > highlightAfter && node.meta.objecttype !== 'Event') {
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
        badge.textContent = node.meta.objecttype;
        if (node.meta.objecttype === 'Attribute') {
            if (!node.meta.object_relationsip) {
                badge.textContent = node.meta.objecttype + '::' + node.meta.type;
            } else {
                badge.textContent = node.meta.objecttype + '::' + node.meta.object_relationship;
            }
        } else if (node.meta.objecttype === 'Galaxy') {
            badge.textContent = node.meta.objecttype + '::' + node.meta.type;
        }
        badge.title = type_explanations[node.meta.objecttype];
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
        filteredEntries = filter_entries(node.meta);
        tip.innerHTML = Object.entries(filteredEntries)
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
  