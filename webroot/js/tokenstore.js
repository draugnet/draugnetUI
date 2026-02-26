// webroot/js/tokenstore.js

function getTokens() {
  return JSON.parse(localStorage.getItem("tokens") || "[]");
}

function saveTokens(tokens) {
  localStorage.setItem("tokens", JSON.stringify(tokens));
  renderTokenList();
}

function renderTokenList() {
  const tokens = getTokens();
  const list  = document.getElementById("token-list");
  const empty = document.getElementById("ts-empty");
  const badge = document.getElementById("ts-count");
  if (!list) return;

  // Update count badge
  if (badge) badge.textContent = tokens.length;

  // Toggle empty state
  if (empty) empty.style.display = tokens.length === 0 ? "flex" : "none";

  list.innerHTML = "";
  tokens.forEach((token) => {
    const li = document.createElement("li");
    li.className = "ts-item";

    // Clickable token (navigate to view page)
    const a = document.createElement("a");
    a.className = "ts-token";
    a.href  = `view.html?token=${encodeURIComponent(token)}`;
    a.textContent = token;
    a.title = token;

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "ts-item-actions";

    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "ts-item-btn";
    copyBtn.title = "Copy token";
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(token);
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 1500);
      } catch (_) {
        // clipboard API unavailable — silently fail
      }
    });

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ts-item-btn ts-delete";
    delBtn.title = "Remove token";
    delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Remove this token from your store?")) {
        saveTokens(getTokens().filter((t) => t !== token));
      }
    });

    actions.appendChild(copyBtn);
    actions.appendChild(delBtn);
    li.appendChild(a);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function addToken() {
  const input = document.getElementById("new-token");
  const token = input.value.trim();
  if (token) {
    const tokens = getTokens();
    if (!tokens.includes(token)) {
      tokens.push(token);
      saveTokens(tokens);
    }
    input.value = "";
  }
}

function downloadTokens() {
  const tokens = getTokens();
  const blob = new Blob([tokens.join("\n")], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "tokens.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function purgeTokens() {
  if (confirm("Are you sure you want to permanently remove all tokens from your store?")) {
    localStorage.removeItem("tokens");
    renderTokenList();
  }
}

async function loadTokenStore() {
  const res = await fetch("tokenstore.html", { cache: "no-cache" });
  if (!res.ok) return;
  const html = await res.text();
  document.getElementById("tokenstore-container").innerHTML = html;
  renderTokenList();

  document.getElementById("btn-add-token").addEventListener("click", addToken);
  document.getElementById("btn-download-tokens").addEventListener("click", downloadTokens);
  document.getElementById("btn-purge-tokens").addEventListener("click", purgeTokens);

  document.getElementById("new-token").addEventListener("keydown", e => {
    if (e.key === "Enter") addToken();
  });
}
