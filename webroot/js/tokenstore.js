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
  const list = document.getElementById("token-list");
  if (!list) return;

  list.innerHTML = "";
  tokens.forEach((token) => {
    // Build <li> containing the token text and a delete button
    const li = document.createElement("li");
    li.className = "d-flex align-items-center justify-content-between mb-1";

    // Clickable span to navigate
    const span = document.createElement("span");
    span.className = "text-truncate";
    span.textContent = token;
    span.style.cursor = "pointer";
    span.onclick = () => {
      window.location.href = `view.html?token=${encodeURIComponent(token)}`;
    };

    // Delete button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm btn-outline-danger ms-2";
    btn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    btn.onclick = (e) => {
      e.stopPropagation();  // don’t trigger the span click
      if (
        confirm(
          "Are you sure you want to permanently remove this token from your token store?"
        )
      ) {
        const newTokens = getTokens().filter((t) => t !== token);
        saveTokens(newTokens);
      }
    };

    // purge all button


    li.appendChild(span);
    li.appendChild(btn);
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tokens.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function purgeTokens() {
  if (confirm("Are you sure you want to permanently remove all tokens from your token store?")) {
    localStorage.removeItem("tokens");
    renderTokenList();
  }
}

async function loadTokenStore() {
  const res = await fetch("tokenstore.html");
  if (!res.ok) return;
  const html = await res.text();
  document.getElementById("tokenstore-container").innerHTML = html;
  renderTokenList();
}
