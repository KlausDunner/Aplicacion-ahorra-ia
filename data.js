// Tiendas organizadas por estrategia. Cada URL usa {q} (encodeURIComponent)
// o {slug} (minúsculas con guiones) según lo que acepta cada sitio.
const STORE_TIERS = [
  {
    id: "value",
    badge: "💎 Mejor calidad-precio",
    tagline: "La opción recomendada para la mayoría de usuarios.",
    desc: "Equilibrio entre precio y calidad. Tiendas con buena variedad, envío rápido y reseñas reales.",
    primary: 0,
    stores: [
      { name: "Google Shopping", url: "https://www.google.com/search?tbm=shop&q={q}" },
      { name: "MercadoLibre", url: "https://listado.mercadolibre.com/{slug}" },
      { name: "Walmart", url: "https://www.walmart.com/search?q={q}" },
      { name: "Target", url: "https://www.target.com/s?searchTerm={q}" },
      { name: "Ripley", url: "https://simple.ripley.cl/search?s={q}" },
    ],
  },
  {
    id: "quality",
    badge: "🏆 Mejor calidad",
    tagline: "Si la calidad es tu prioridad.",
    desc: "Tiendas premium con garantía oficial, servicio post-venta y productos originales verificados.",
    primary: 0,
    stores: [
      { name: "Amazon", url: "https://www.amazon.com/s?k={q}" },
      { name: "Apple Store", url: "https://www.apple.com/shop/buy-search?q={q}" },
      { name: "Best Buy", url: "https://www.bestbuy.com/site/searchpage.jsp?st={q}" },
      { name: "Falabella", url: "https://www.falabella.com/falabella-cl/search?Ntt={q}" },
      { name: "El Corte Inglés", url: "https://www.elcorteingles.es/search/?s={q}" },
    ],
  },
  {
    id: "cheap",
    badge: "💰 Alternativa económica",
    tagline: "Si buscas el precio más bajo posible.",
    desc: "Importaciones, ofertas y mayoristas globales. Tiempos de envío más largos pero precios imbatibles.",
    primary: 0,
    stores: [
      { name: "AliExpress", url: "https://www.aliexpress.com/wholesale?SearchText={q}" },
      { name: "Temu", url: "https://www.temu.com/search_result.html?search_key={q}" },
      { name: "eBay", url: "https://www.ebay.com/sch/i.html?_nkw={q}" },
      { name: "Shein", url: "https://www.shein.com/pdsearch/{slug}/" },
      { name: "Wish", url: "https://www.wish.com/search/{q}" },
    ],
  },
  {
    id: "universal",
    badge: "🔍 Comparador universal",
    tagline: "Funciona con cualquier cosa: productos, servicios, tarjetas de crédito, seguros...",
    desc: "Busca en buscadores generales, reseñas y comparadores. Ideal para lo que no está en tiendas normales.",
    primary: 0,
    stores: [
      { name: "Google", url: "https://www.google.com/search?q={q}" },
      { name: "Google Shopping", url: "https://www.google.com/search?tbm=shop&q={q}" },
      { name: "YouTube reseñas", url: "https://www.youtube.com/results?search_query={q}+reseña+opinión" },
      { name: "Reddit", url: "https://www.reddit.com/search/?q={q}" },
      { name: "Google Imágenes", url: "https://www.google.com/search?tbm=isch&q={q}" },
    ],
  },
];
