// Ahorra IA - Lógica principal del cliente
// Motor simple de "IA" que:
//  1) Comprende la intención (busca keywords/categoría).
//  2) Filtra el catálogo.
//  3) Selecciona 3 opciones clave: mejor calidad, mejor calidad-precio, alternativa económica.
//  4) Aprende de búsquedas pasadas guardándolas en localStorage.

const $ = (sel) => document.querySelector(sel);

const form = $("#search-form");
const queryInput = $("#query");
const budgetInput = $("#budget");
const brandInput = $("#brand");
const priorityInput = $("#priority");
const categoryInput = $("#category");
const resultsEl = $("#results");
const statusEl = $("#status");
const chatSection = $("#chat");
const chatLog = $("#chat-log");
const chatForm = $("#chat-form");
const chatInput = $("#chat-input");
const prefsBox = $("#prefs-box");
const clearPrefsBtn = $("#clear-prefs");

const PREFS_KEY = "ahorraia.prefs.v1";
let lastPicks = null;

// ---------- Preferencias del usuario ----------
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || { history: [], brands: {}, categories: {} };
  } catch {
    return { history: [], brands: {}, categories: {} };
  }
}

function savePrefs(p) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

function recordSearch(query, filters) {
  const prefs = loadPrefs();
  prefs.history.unshift({ query, filters, date: new Date().toISOString() });
  prefs.history = prefs.history.slice(0, 10);
  if (filters.brand) {
    const b = filters.brand.toLowerCase();
    prefs.brands[b] = (prefs.brands[b] || 0) + 1;
  }
  if (filters.category) {
    prefs.categories[filters.category] = (prefs.categories[filters.category] || 0) + 1;
  }
  savePrefs(prefs);
  renderPrefs();
}

function renderPrefs() {
  const prefs = loadPrefs();
  if (!prefs.history.length) {
    prefsBox.innerHTML = `<p class="prefs-empty">Aún no tenemos búsquedas registradas. ¡Empieza a buscar!</p>`;
    return;
  }
  const historyTags = prefs.history
    .map((h) => `<span class="pref-tag">🔎 ${escapeHtml(h.query || "(sin texto)")}</span>`)
    .join("");
  const brandTags = Object.entries(prefs.brands)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([b, n]) => `<span class="pref-tag">⭐ ${escapeHtml(b)} · ${n}</span>`)
    .join("");
  const catTags = Object.entries(prefs.categories)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `<span class="pref-tag">📦 ${escapeHtml(c)} · ${n}</span>`)
    .join("");
  prefsBox.innerHTML = `
    <div><strong>Búsquedas recientes:</strong><br>${historyTags}</div>
    ${brandTags ? `<div style="margin-top:10px"><strong>Marcas favoritas:</strong><br>${brandTags}</div>` : ""}
    ${catTags ? `<div style="margin-top:10px"><strong>Categorías favoritas:</strong><br>${catTags}</div>` : ""}
  `;
}

clearPrefsBtn.addEventListener("click", () => {
  localStorage.removeItem(PREFS_KEY);
  renderPrefs();
});

// ---------- Motor de búsqueda / filtrado ----------
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(q) {
  return normalize(q)
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function matchScore(product, tokens) {
  if (!tokens.length) return 1;
  const haystack = [
    product.name,
    product.brand,
    product.category,
    ...(product.keywords || []),
  ]
    .map(normalize)
    .join(" ");
  let hits = 0;
  for (const t of tokens) if (haystack.includes(t)) hits++;
  return hits / tokens.length;
}

function filterProducts({ query, budget, brand, category }) {
  const tokens = tokenize(query);
  const brandNorm = normalize(brand);
  return CATALOG
    .map((p) => ({ ...p, _match: matchScore(p, tokens) }))
    .filter((p) => p._match >= 0.5 || !tokens.length)
    .filter((p) => (budget ? p.price <= budget : true))
    .filter((p) => (brandNorm ? normalize(p.brand).includes(brandNorm) : true))
    .filter((p) => (category ? p.category === category : true));
}

// ---------- Selección de las 3 opciones clave ----------
function pickThree(products, priority) {
  if (!products.length) return null;

  // Mejor calidad: mayor rating (ponderado por reviews).
  const qualityScored = products
    .map((p) => ({ ...p, _q: p.rating + Math.log10(p.reviews + 10) * 0.15 }))
    .sort((a, b) => b._q - a._q);
  const bestQuality = qualityScored[0];

  // Mejor relación calidad-precio: rating / precio (ponderado).
  const valueScored = products
    .map((p) => ({ ...p, _v: (p.rating * p.rating) / Math.max(p.price, 1) }))
    .sort((a, b) => b._v - a._v);
  const bestValue = valueScored.find((p) => p.id !== bestQuality.id) || valueScored[0];

  // Alternativa económica: precio más bajo con rating decente (>=4.0).
  const cheapCandidates = products
    .filter((p) => p.rating >= 4.0 && p.id !== bestQuality.id && p.id !== bestValue.id)
    .sort((a, b) => a.price - b.price);
  const cheapest =
    cheapCandidates[0] ||
    [...products].filter((p) => p.id !== bestQuality.id && p.id !== bestValue.id)
      .sort((a, b) => a.price - b.price)[0];

  // Aplicar prioridad del usuario reordenando visualmente
  const picks = { bestQuality, bestValue, cheapest };
  if (priority === "quality") {
    return { primary: bestQuality, secondary: bestValue, tertiary: cheapest, picks };
  } else if (priority === "price") {
    return { primary: cheapest || bestValue, secondary: bestValue, tertiary: bestQuality, picks };
  }
  return { primary: bestValue, secondary: bestQuality, tertiary: cheapest, picks };
}

// ---------- Render ----------
function card(product, badge, reasons) {
  if (!product) return "";
  return `
    <article class="result-card">
      <span class="badge ${badge.kind}">${badge.label}</span>
      <div class="store">${escapeHtml(product.store)} · ${escapeHtml(product.brand)}</div>
      <h3>${escapeHtml(product.name)}</h3>
      <div class="price-row">
        <span class="price">$${product.price.toLocaleString("es-ES")}</span>
        <span class="rating">★ ${product.rating.toFixed(1)}</span>
        <span class="store">(${product.reviews.toLocaleString("es-ES")} reseñas)</span>
      </div>
      <ul class="reasons">
        ${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
      </ul>
      <a class="card-link" href="${product.url}" target="_blank" rel="noopener">Ver en ${escapeHtml(product.store)} →</a>
    </article>
  `;
}

function reasonsFor(product, kind, all) {
  const cheapest = [...all].sort((a, b) => a.price - b.price)[0];
  const savings = cheapest && product.price > cheapest.price
    ? `Ahorras hasta $${(product.price - cheapest.price).toLocaleString("es-ES")} comparado con otras opciones.`
    : null;
  if (kind === "quality") {
    return [
      `Calificación destacada: ${product.rating.toFixed(1)}★ con ${product.reviews.toLocaleString("es-ES")} reseñas.`,
      `Marca reconocida: ${product.brand}.`,
      "Recomendado cuando la calidad es la prioridad.",
    ];
  }
  if (kind === "value") {
    return [
      `Equilibrio entre precio ($${product.price}) y calidad (${product.rating.toFixed(1)}★).`,
      "La opción más inteligente para la mayoría de usuarios.",
      savings || "Precio competitivo para sus prestaciones.",
    ];
  }
  return [
    `Precio accesible: $${product.price}.`,
    `Mantiene buena valoración (${product.rating.toFixed(1)}★).`,
    "Ideal si quieres minimizar el gasto sin perder funcionalidad.",
  ];
}

function render(result, products) {
  if (!result) {
    resultsEl.innerHTML = "";
    showStatus("No encontramos productos que coincidan. Intenta con otros términos o ajusta los filtros.");
    chatSection.classList.add("hidden");
    return;
  }
  const { picks } = result;
  const { bestQuality, bestValue, cheapest } = picks;

  resultsEl.innerHTML = [
    card(bestQuality, { kind: "quality", label: "🏆 Mejor calidad" }, reasonsFor(bestQuality, "quality", products)),
    card(bestValue, { kind: "value", label: "💎 Mejor calidad-precio" }, reasonsFor(bestValue, "value", products)),
    card(cheapest, { kind: "cheap", label: "💰 Alternativa económica" }, reasonsFor(cheapest, "cheap", products)),
  ].join("");

  showStatus(
    `Analizamos ${products.length} productos de múltiples tiendas y seleccionamos las 3 opciones clave para ti.`
  );
  chatSection.classList.remove("hidden");
}

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.remove("hidden");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// ---------- Eventos ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const filters = {
    query: queryInput.value.trim(),
    budget: budgetInput.value ? Number(budgetInput.value) : null,
    brand: brandInput.value.trim(),
    category: categoryInput.value,
  };
  const priority = priorityInput.value;

  const products = filterProducts(filters);
  const result = pickThree(products, priority);
  lastPicks = result ? result.picks : null;
  render(result, products);
  recordSearch(filters.query, filters);
  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Chat: respuestas basadas en las 3 opciones seleccionadas ----------
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  appendMsg("user", text);
  chatInput.value = "";
  const reply = answer(text, lastPicks);
  setTimeout(() => appendMsg("bot", reply), 350);
});

function appendMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function answer(q, picks) {
  if (!picks) return "Primero realiza una búsqueda para poder comparar opciones.";
  const { bestQuality, bestValue, cheapest } = picks;
  const n = normalize(q);

  if (/(calidad|mejor|premium|durab)/.test(n)) {
    return `Si priorizas calidad, te recomiendo "${bestQuality.name}" (${bestQuality.rating.toFixed(1)}★, ${bestQuality.reviews.toLocaleString("es-ES")} reseñas) por $${bestQuality.price} en ${bestQuality.store}. Es la opción con mayor respaldo de usuarios.`;
  }
  if (/(barat|econom|menor precio|ahorr|gast)/.test(n)) {
    return `La alternativa más económica es "${cheapest.name}" por $${cheapest.price} en ${cheapest.store}. Mantiene una valoración de ${cheapest.rating.toFixed(1)}★, así que ahorras sin sacrificar lo esencial.`;
  }
  if (/(diferenc|comparar|vs|versus|cu[aá]l)/.test(n)) {
    const diffQ = bestQuality.price - bestValue.price;
    const diffC = bestValue.price - cheapest.price;
    return `Comparativa rápida:\n• Calidad: ${bestQuality.name} — $${bestQuality.price} · ${bestQuality.rating.toFixed(1)}★\n• Calidad-precio: ${bestValue.name} — $${bestValue.price} · ${bestValue.rating.toFixed(1)}★\n• Económica: ${cheapest.name} — $${cheapest.price} · ${cheapest.rating.toFixed(1)}★\n\nPagar por la de mayor calidad cuesta $${diffQ} más que la recomendada, y la económica ahorra $${diffC} respecto a la equilibrada.`;
  }
  if (/(vale la pena|merece|recomend)/.test(n)) {
    return `Para la mayoría de usuarios, la mejor decisión es "${bestValue.name}" por $${bestValue.price}: combina una excelente valoración (${bestValue.rating.toFixed(1)}★) con un precio razonable. Solo paga más si necesitas lo top de la categoría.`;
  }
  if (/(bater|durac|autonom)/.test(n)) {
    return `No tengo datos oficiales de batería en esta demo, pero productos como "${bestQuality.name}" de ${bestQuality.brand} suelen encabezar las pruebas independientes. Te sugiero revisar el enlace del producto para ver la ficha técnica actualizada.`;
  }
  if (/(env[ií]o|shipping|entrega)/.test(n)) {
    return `El tiempo de envío depende de la tienda. ${bestValue.store} y ${bestQuality.store} suelen tener opciones express; las ofertas de AliExpress pueden tardar más. Te recomiendo revisar directamente en el enlace.`;
  }
  if (/(hola|buenas|saludos)/.test(n)) {
    return "¡Hola! Puedo ayudarte a comparar las 3 opciones que seleccioné: mejor calidad, mejor calidad-precio y alternativa económica. Pregúntame lo que necesites.";
  }
  return `Entre las 3 opciones (${bestQuality.name}, ${bestValue.name}, ${cheapest.name}), la recomendada para la mayoría es "${bestValue.name}" por su equilibrio entre precio y valoración. ¿Quieres que las compare en algún aspecto específico?`;
}

// ---------- Inicial ----------
renderPrefs();
