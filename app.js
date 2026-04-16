// Ahorra IA - App principal
// Búsqueda universal de links + chat inteligente vía Groq LLM.

const $ = (sel) => document.querySelector(sel);

const form = $("#search-form");
const queryInput = $("#query");
const resultsEl = $("#results");
const statusEl = $("#status");
const aiSummary = $("#ai-summary");
const aiSummaryContent = $("#ai-summary-content");
const aiSummaryStatus = $("#ai-summary-status");
const chatSection = $("#chat");
const chatLog = $("#chat-log");
const chatForm = $("#chat-form");
const chatInput = $("#chat-input");
const prefsBox = $("#prefs-box");
const clearPrefsBtn = $("#clear-prefs");
const configBtn = $("#config-btn");
const configModal = $("#config-modal");
const modalClose = $("#modal-close");
const apiKeyInput = $("#api-key-input");
const saveKeyBtn = $("#save-key");
const clearKeyBtn = $("#clear-key");
const configStatus = $("#config-status");

const PREFS_KEY = "ahorraia.prefs.v2";
let lastQuery = "";
let chatHistory = [];

// ---------- Preferencias ----------
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || { history: [] }; }
  catch { return { history: [] }; }
}
function savePrefs(p) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }
function recordSearch(q) {
  if (!q) return;
  const prefs = loadPrefs();
  prefs.history = [q, ...prefs.history.filter((x) => x !== q)].slice(0, 10);
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

// ---------- URLs ----------
function slugify(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
function buildUrl(template, query) {
  return template.replace("{slug}", slugify(query)).replace("{q}", encodeURIComponent(query));
}

// ---------- Render ----------
function tierCard(tier, query) {
  const primary = tier.stores[tier.primary];
  const others = tier.stores.filter((_, i) => i !== tier.primary);
  const primaryUrl = buildUrl(primary.url, query);
  const otherLinks = others
    .map((s) => `<a class="store-link" href="${buildUrl(s.url, query)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`)
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
  showStatus(`Resultados para "${query}" en ${STORE_TIERS.reduce((n, t) => n + t.stores.length, 0)} tiendas y comparadores.`);
  chatSection.classList.remove("hidden");
}

// Enhanced cards: LLM picks 3 specific products and we build store links per pick
const PICKS_PROMPT = `Eres Ahorra IA. BUSCA EN INTERNET productos reales para el usuario y devuelve 3 opciones con URLs directas a la página de compra (no búsquedas).

Responde en JSON válido, sin markdown, sin texto extra:

{
  "quality": {
    "product": "nombre exacto del modelo y variante",
    "price": "precio real encontrado con moneda",
    "store": "nombre de la tienda",
    "url": "URL DIRECTA al producto (no a búsqueda)",
    "reason": "1 frase justificando"
  },
  "value": {"product": "...", "price": "...", "store": "...", "url": "...", "reason": "..."},
  "cheap": {"product": "...", "price": "...", "store": "...", "url": "...", "reason": "..."}
}

REGLAS:
- quality = mejor opción absoluta (ignora el precio)
- value = mejor relación calidad-precio
- cheap = alternativa económica con calidad aceptable
- Las URLs DEBEN ser páginas específicas de producto encontradas en tu búsqueda web (Amazon, MercadoLibre, Walmart, Falabella, AliExpress, etc.)
- Precios REALES vistos en las tiendas, con moneda clara
- Si el usuario busca un servicio (tarjeta de crédito, seguro), sugiere productos específicos con links a páginas oficiales

Responde SOLO el JSON.`;

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

async function generateSmartPicks(query) {
  if (!hasApiKey()) return;
  const picksEl = document.getElementById("smart-picks");
  picksEl.classList.remove("hidden");
  picksEl.innerHTML = `<div class="picks-loading">🌐 Buscando en internet productos reales para "${escapeHtml(query)}"... (puede tardar 10-20s)</div>`;
  try {
    const raw = await callLLM(
      [
        { role: "system", content: PICKS_PROMPT },
        { role: "user", content: `Busca en internet las 3 mejores opciones para: ${query}` },
      ],
      { maxTokens: 900, temperature: 0.3, model: "compound-beta" }
    );
    const data = JSON.parse(extractJson(raw));
    renderSmartPicks(data, query);
  } catch (err) {
    // Fallback al modelo normal sin búsqueda web
    try {
      const raw = await callLLM(
        [
          { role: "system", content: PICKS_PROMPT },
          { role: "user", content: query },
        ],
        { maxTokens: 600, temperature: 0.3 }
      );
      const data = JSON.parse(extractJson(raw));
      renderSmartPicks(data, query);
    } catch (err2) {
      picksEl.innerHTML = `<div class="picks-error">⚠️ No pude generar recomendaciones: ${escapeHtml(err2.message)}</div>`;
    }
  }
}

function isValidUrl(u) {
  try { return /^https?:\/\//.test(u) && new URL(u); } catch { return false; }
}

function smartPickCard(tierId, pick, query) {
  const tier = STORE_TIERS.find((t) => t.id === tierId);
  if (!tier || !pick || !pick.product) return "";
  const hasRealUrl = isValidUrl(pick.url);
  const primaryUrl = hasRealUrl ? pick.url : buildUrl(tier.stores[0].url, pick.product);
  const primaryStore = hasRealUrl && pick.store ? pick.store : tier.stores[0].name;
  const altStores = tier.stores.slice(0, 4);
  const otherLinks = altStores
    .map((s) => `<a class="store-link" href="${buildUrl(s.url, pick.product)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`)
    .join("");
  return `
    <article class="result-card tier-${tier.id}">
      <span class="badge ${tier.id}">${tier.badge}</span>
      <h3>${escapeHtml(pick.product)}</h3>
      <p class="pick-price">💵 ${escapeHtml(pick.price || "Precio variable")}</p>
      <p class="tier-desc">${escapeHtml(pick.reason || "")}</p>
      <a class="card-link primary" href="${primaryUrl}" target="_blank" rel="noopener">
        ${hasRealUrl ? "🛒 Comprar" : "🔎 Buscar"} en ${escapeHtml(primaryStore)} →
      </a>
      <div class="store-links">
        <span class="store-links-label">También buscar este producto en:</span>
        ${otherLinks}
      </div>
    </article>
  `;
}

function renderSmartPicks(data, query) {
  const picksEl = document.getElementById("smart-picks");
  const html = [
    `<h2 class="picks-title">🎯 Las 3 mejores opciones según la IA</h2>`,
    `<div class="picks-grid">`,
    smartPickCard("quality", data.quality, query),
    smartPickCard("value", data.value, query),
    smartPickCard("cheap", data.cheap, query),
    `</div>`,
  ].join("");
  picksEl.innerHTML = html;
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

// ---------- Resumen IA al buscar ----------
const SEARCH_PROMPT = `Eres Ahorra IA, asistente de compras en español chileno/latino. El usuario buscó un producto o servicio. Da un resumen corto y útil.

Formato obligatorio (usa saltos de línea, sin markdown):
1) Qué es / qué buscar (1 oración)
2) Rango de precio típico en USD (si lo sabes; dilo con "aproximado")
3) 2-3 modelos o variantes específicas a buscar (para que el usuario tenga nombres concretos)
4) 1 tip clave para elegir

Máximo 80 palabras. Directo, sin introducciones ni despedidas.`;

async function generateSearchSummary(query) {
  if (!hasApiKey()) {
    aiSummary.classList.remove("hidden");
    aiSummaryContent.innerHTML = `💡 Activa el chat inteligente: <button id="open-config-inline" class="inline-btn">configurar IA gratis</button>`;
    $("#open-config-inline")?.addEventListener("click", openConfig);
    aiSummaryStatus.textContent = "";
    return;
  }
  aiSummary.classList.remove("hidden");
  aiSummaryStatus.textContent = "Pensando...";
  aiSummaryContent.textContent = "";
  try {
    const text = await callLLM(
      [
        { role: "system", content: SEARCH_PROMPT },
        { role: "user", content: `Búsqueda: "${query}"` },
      ],
      { maxTokens: 250, temperature: 0.5 }
    );
    aiSummaryContent.textContent = text;
    aiSummaryStatus.textContent = "";
  } catch (err) {
    aiSummaryContent.textContent = `⚠️ ${err.message}`;
    aiSummaryStatus.textContent = "";
  }
}

// ---------- Chat IA ----------
const CHAT_SYSTEM_PROMPT = `Eres Ahorra IA, asistente de compras inteligente en español.

Reglas:
- Responde preguntas factuales sobre productos (specs, batería, cámara, comparaciones, pros/cons) usando tu conocimiento. Sé específico con datos concretos.
- Para precios actuales o stock en tiempo real: di que no tienes ese dato y sugiere dónde revisarlo (tiendas de la app).
- Respuestas concisas: 2-4 oraciones. Sin relleno. Sin introducciones.
- Tono amigable y directo. Español latino neutro.
- Si el usuario solo saluda, salúdalo y pregunta qué necesita.`;

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  appendMsg("user", text);
  chatInput.value = "";

  if (!hasApiKey()) {
    appendMsg("bot", "Para respuestas inteligentes necesito una API key gratuita. Haz clic en ⚙️ Configurar IA arriba (toma 30 segundos).");
    return;
  }

  chatHistory.push({ role: "user", content: text });
  const context = lastQuery ? `\n\nContexto: el usuario está investigando "${lastQuery}".` : "";
  const messages = [
    { role: "system", content: CHAT_SYSTEM_PROMPT + context },
    ...chatHistory.slice(-10),
  ];

  const loadingMsg = appendMsg("bot", "Pensando…");
  try {
    const response = await callLLM(messages, { maxTokens: 400, temperature: 0.6 });
    loadingMsg.textContent = response;
    chatHistory.push({ role: "assistant", content: response });
  } catch (err) {
    loadingMsg.textContent = `⚠️ ${err.message}`;
  }
});

document.querySelectorAll(".chat-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chatInput.value = chip.dataset.q;
    chatForm.requestSubmit();
  });
});

function appendMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

// ---------- Config modal ----------
function openConfig() {
  apiKeyInput.value = getApiKey();
  configModal.classList.remove("hidden");
  updateConfigStatus();
}
function closeConfig() { configModal.classList.add("hidden"); }
function updateConfigBtn() {
  configBtn.textContent = hasApiKey() ? "✅ IA conectada" : "⚙️ Configurar IA";
}
function updateConfigStatus() {
  configStatus.textContent = hasApiKey()
    ? "✅ Key guardada. El chat y el resumen están activos."
    : "❌ Sin key configurada.";
}

configBtn.addEventListener("click", openConfig);
modalClose.addEventListener("click", closeConfig);
configModal.addEventListener("click", (e) => { if (e.target === configModal) closeConfig(); });
saveKeyBtn.addEventListener("click", () => {
  const k = apiKeyInput.value.trim();
  if (!k.startsWith("gsk_")) {
    alert("La key debe empezar con 'gsk_'. Revisa que la hayas copiado completa.");
    return;
  }
  setApiKey(k);
  updateConfigBtn();
  updateConfigStatus();
  setTimeout(closeConfig, 800);
});
clearKeyBtn.addEventListener("click", () => {
  clearApiKey();
  apiKeyInput.value = "";
  updateConfigBtn();
  updateConfigStatus();
});

// ---------- Buscar ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;
  lastQuery = query;
  chatHistory = [];
  chatLog.innerHTML = "";
  render(query);
  recordSearch(query);
  generateSearchSummary(query);
  generateSmartPicks(query);
  aiSummary.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Inicial ----------
renderPrefs();
updateConfigBtn();
