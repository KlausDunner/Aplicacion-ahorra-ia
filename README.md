# Ahorra IA

App web que busca las mejores ofertas de productos en múltiples tiendas y, con inteligencia artificial, te entrega **3 opciones clave**:

- 🏆 **Mejor calidad**
- 💎 **Mejor relación calidad-precio**
- 💰 **Alternativa económica**

## Cómo funciona

1. **Comprender al usuario** — la app analiza tu consulta y aprende de tu historial (búsquedas, marcas y categorías preferidas).
2. **Filtrar información** — procesa un catálogo agregado desde múltiples tiendas (Amazon, MercadoLibre, AliExpress, BestBuy, Apple, etc.) y filtra según tus preferencias.
3. **Adaptarse al mercado** — el catálogo está pensado para actualizarse continuamente con nuevos productos y precios.
4. **Decidir con criterio** — te muestra solo 3 opciones y abre un chat para resolver dudas antes de comprar.

## Cómo ejecutarla

Es una app estática. Puedes abrirla de dos formas:

**Opción 1 — Abrir directamente:**
```
open index.html   # macOS
xdg-open index.html  # Linux
```

**Opción 2 — Servidor local (recomendado):**
```bash
python3 -m http.server 8000
# luego visita http://localhost:8000
```

## Estructura

```
.
├── index.html    # Estructura de la app
├── styles.css    # Diseño y responsive
├── data.js       # Catálogo simulado de productos
└── app.js        # Motor IA: filtrado, selección de 3 opciones, chat, preferencias
```

## Próximos pasos

- Conectar scrapers/APIs reales de tiendas para datos en vivo.
- Integrar un modelo LLM (Claude, por ejemplo) para el chat contextual.
- Sincronizar preferencias del usuario en la nube.
