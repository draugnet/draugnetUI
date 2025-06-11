
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
      const li = document.createElement("li");
      li.textContent = token;
      li.className = "token-item text-truncate";
      li.onclick = () => {
        window.location.href = `view.html?token=${encodeURIComponent(
          token
        )}`;
      };
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


// ─── Load token‐store panel ────────────────────────────────────────────────
async function loadTokenStore() {
    const res = await fetch("tokenstore.html");
    if (!res.ok) return;
    const html = await res.text();
    document.getElementById("tokenstore-container").innerHTML = html;
    renderTokenList();
}