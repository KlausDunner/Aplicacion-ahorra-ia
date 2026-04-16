// Ahorra IA - Motor de búsqueda universal
// Para cualquier consulta genera links reales a múltiples tiendas/comparadores
// organizados en 4 estrategias: calidad-precio, calidad, económica y universal.

const $ = (sel) => document.querySelector(sel);

const form = $("#search-form");
const queryInput = $("#query");
const resultsEl = $("#results");
const statusEl = $("#status");
const chatSection = $("#chat");
const chatLog = $("#chat-log");
const chatForm = $("#chat-form");
const chatInput = $("#chat-input");
const prefsBox = $("#prefs-box");
const clearPrefsBtn = $("#clear-prefs");

const PREFS_KEY = "ahorraia.prefs.v2";
let lastQuery = "";

// ---------- Preferencias del usuario ----------
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || { history: [] };
  } catch {
    return { history: [] };
  }
}
function savePrefs(p) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
function recordSearch(query) {
  if (!query) return;
  const prefs = loadPrefs();
  prefs.history = [query, ...prefs.history.filter((q) => q !== query)].slice(0, 10);
  savePrefs(prefs);
  renderPrefs();
}
function renderPrefs() {
  const prefs = loadPrefs();
  if (!prefs.history.length) {
    prefsBox.innerHTML = `<p class="prefs-empty">Aún no tenemos búsquedas registradas. ¡Empieza a buscar!</p>`;
    return;
  }
  const tags = prefs.history
    .map((q) => `<span class="pref-tag" data-q="${escapeHtml(q)}">🔎 ${escapeHtml(q)}</span>`)
    .join("");
  prefsBox.innerHTML = `<div><strong>Búsquedas recientes (clic para repetir):</strong><br>${tags}</div>`;
  prefsBox.querySelectorAll(".pref-tag").forEach((el) => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => {
      queryInput.value = el.dataset.q;
      form.requestSubmit();
    });
  });
}
clearPrefsBtn.addEventListener("click", () => {
  localStorage.removeItem(PREFS_KEY);
  renderPrefs();
});

// ---------- Construcción de URLs ----------
function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function buildUrl(template, query) {
  return template
    .replace("{slug}", slugify(query))
    .replace("{q}", encodeURIComponent(query));
}

// ---------- Render ----------
function tierCard(tier, query) {
  const primary = tier.stores[tier.primary];
  const others = tier.stores.filter((_, i) => i !== tier.primary);
  const primaryUrl = buildUrl(primary.url, query);
  const otherLinks = others
    .map(
      (s) =>
        `<a class="store-link" href="${buildUrl(s.url, query)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`
    )
    .join("");

  return `
    <article class="result-card tier-${tier.id}">
      <span class="badge ${tier.id}">${tier.badge}</span>
      <h3>${escapeHtml(tier.tagline)}</h3>
      <p class="tier-desc">${escapeHtml(tier.desc)}</p>
      <a class="card-link primary" href="${primaryUrl}" target="_blank" rel="noopener">
        Ver en ${escapeHtml(primary.name)} →
      </a>
      <div class="store-links">
        <span class="store-links-label">También buscar en:</span>
        ${otherLinks}
      </div>
    </article>
  `;
}

function render(query) {
  resultsEl.innerHTML = STORE_TIERS.map((t) => tierCard(t, query)).join("");
  showStatus(
    `Resultados para "${query}" en ${STORE_TIERS.reduce((n, t) => n + t.stores.length, 0)} tiendas y comparadores.`
  );
  chatSection.classList.remove("hidden");
}

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.remove("hidden");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------- Eventos ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;
  lastQuery = query;
  render(query);
  recordSearch(query);
  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Chat ----------
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  appendMsg("user", text);
  chatInput.value = "";
  setTimeout(() => appendMsg("bot", answer(text, lastQuery)), 350);
});

function appendMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function answer(q, query) {
  const n = normalize(q);
  if (!query) return "Primero busca un producto arriba y luego te ayudo a decidir.";

  if (/(calidad|mejor|premium|durab|original|garant)/.test(n)) {
    return `Para calidad máxima de "${query}" te recomiendo empezar por Amazon, Apple Store o Best Buy. Tienen productos originales con garantía y políticas de devolución claras.`;
  }
  if (/(barat|econom|bajo precio|ahorr|gast)/.test(n)) {
    return `Para el precio más bajo de "${query}" revisa AliExpress, Temu y eBay. Son imbatibles en precio aunque el envío puede tardar semanas. Shein es bueno para moda.`;
  }
  if (/(tarjeta|cr[eé]dito|pr[eé]stamo|seguro|banco|tasa)/.test(n)) {
    return `Para productos financieros como "${query}", Google Shopping no sirve. Usa el comparador universal (Google normal) y busca comparadores como NerdWallet, Rankia, o las webs oficiales de los bancos.`;
  }
  if (/(envio|shipping|entrega|tiempo)/.test(n)) {
    return `Amazon, Walmart y MercadoLibre suelen entregar en 1-3 días. AliExpress y Temu tardan 10-30 días pero son mucho más baratos. Revisa siempre las fechas antes de comprar.`;
  }
  if (/(rese[ñn]a|opini|review)/.test(n)) {
    return `Para reseñas reales de "${query}" usa la tarjeta 🔍 Comparador universal: YouTube y Reddit suelen tener opiniones honestas de usuarios reales.`;
  }
  if (/(diferenc|comparar|vs|versus|cu[aá]l)/.test(n)) {
    return `Mi recomendación general:\n• Empieza por 💎 Mejor calidad-precio (Google Shopping / MercadoLibre).\n• Si el producto es importante (ej. electrónica cara), sube a 🏆 Mejor calidad.\n• Si es algo que usarás poco, baja a 💰 Económica.\n• Si es un servicio/financiero, usa 🔍 Universal.`;
  }
  if (/(hola|buenas|saludos|hey)/.test(n)) {
    return "¡Hola! Puedo orientarte sobre qué tienda elegir y cómo evaluar los resultados. Pregúntame lo que quieras.";
  }
  return `Para "${query}" te sugiero empezar con Google Shopping (tarjeta 💎) — agrega resultados de muchas tiendas. Si no encuentras lo que buscas ahí, prueba el comparador universal (🔍).`;
}

// ---------- Inicial ----------
renderPrefs();
