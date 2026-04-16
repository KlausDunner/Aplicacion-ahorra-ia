// Tiendas chilenas organizadas por estrategia. Fallback cuando la IA no provee URL directa.
const STORE_TIERS = [
  {
    id: "value",
    badge: "💎 Mejor calidad-precio",
    tagline: "La opción recomendada para la mayoría de usuarios.",
    desc: "Tiendas chilenas con buena variedad, despacho nacional y buenos precios.",
    primary: 0,
    stores: [
      { name: "MercadoLibre Chile", url: "https://listado.mercadolibre.cl/{slug}" },
      { name: "Falabella", url: "https://www.falabella.com/falabella-cl/search?Ntt={q}" },
      { name: "Paris", url: "https://www.paris.cl/search/?q={q}" },
      { name: "Lider", url: "https://www.lider.cl/catalogo/search?query={q}" },
      { name: "Ripley", url: "https://simple.ripley.cl/search?s={q}" },
    ],
  },
  {
    id: "quality",
    badge: "🏆 Mejor calidad",
    tagline: "Si la calidad es tu prioridad.",
    desc: "Tiendas chilenas premium: garantía oficial, servicio técnico y productos 100% originales.",
    primary: 0,
    stores: [
      { name: "Falabella", url: "https://www.falabella.com/falabella-cl/search?Ntt={q}" },
      { name: "PC Factory", url: "https://www.pcfactory.cl/search?q={q}" },
      { name: "SP Digital", url: "https://www.spdigital.cl/search/products?keywords={q}" },
      { name: "Paris", url: "https://www.paris.cl/search/?q={q}" },
      { name: "Sodimac", url: "https://sodimac.falabella.com/sodimac-cl/search?Ntt={q}" },
    ],
  },
  {
    id: "cheap",
    badge: "💰 Alternativa económica",
    tagline: "Si buscas el precio más bajo posible en Chile.",
    desc: "Las opciones más baratas disponibles para Chile: ofertas, outlets e importación.",
    primary: 0,
    stores: [
      { name: "MercadoLibre Chile", url: "https://listado.mercadolibre.cl/{slug}" },
      { name: "AliExpress (envío a Chile)", url: "https://www.aliexpress.com/wholesale?SearchText={q}&shipCountry=CL" },
      { name: "La Polar", url: "https://www.lapolar.cl/search/?q={q}" },
      { name: "Hites", url: "https://www.hites.com/search?q={q}" },
      { name: "AbcDin", url: "https://www.abcdin.cl/tienda/es/abcdin-cl/search?q={q}" },
    ],
  },
  {
    id: "universal",
    badge: "🔍 Comparador universal",
    tagline: "Funciona con cualquier cosa: productos, servicios, tarjetas de crédito, seguros...",
    desc: "Buscadores y comparadores generales enfocados en Chile.",
    primary: 0,
    stores: [
      { name: "Google Chile", url: "https://www.google.cl/search?q={q}" },
      { name: "Google Shopping CL", url: "https://www.google.cl/search?tbm=shop&q={q}" },
      { name: "YouTube reseñas", url: "https://www.youtube.com/results?search_query={q}+chile+reseña" },
      { name: "Reddit Chile", url: "https://www.reddit.com/r/chile/search/?q={q}" },
      { name: "Google Imágenes", url: "https://www.google.cl/search?tbm=isch&q={q}" },
    ],
  },
];
