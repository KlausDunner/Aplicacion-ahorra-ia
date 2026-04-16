// Cliente para la API de Groq (LLM gratuito).
// La key se guarda solo en localStorage del navegador del usuario.
const LLM_CONFIG = {
  endpoint: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile",
  keyStorage: "ahorraia.apikey.v1",
};

function getApiKey() {
  return localStorage.getItem(LLM_CONFIG.keyStorage) || "";
}
function setApiKey(k) {
  localStorage.setItem(LLM_CONFIG.keyStorage, k);
}
function clearApiKey() {
  localStorage.removeItem(LLM_CONFIG.keyStorage);
}
function hasApiKey() {
  return !!getApiKey();
}

async function callLLM(messages, { maxTokens = 400, temperature = 0.7 } = {}) {
  const key = getApiKey();
  if (!key) throw new Error("Falta la API key. Haz clic en ⚙️ arriba para configurarla.");

  const res = await fetch(LLM_CONFIG.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: LLM_CONFIG.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error("API key inválida. Verifícala en console.groq.com/keys.");
    if (res.status === 429) throw new Error("Límite de uso alcanzado por ahora. Espera unos segundos.");
    throw new Error(`Error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}
