# UnivalleShop React

React + TypeScript + Vite. Catálogo, búsqueda, publicación, perfil de demostración, intereses, recomendaciones, carrito y comprobantes de pagos simulados.

`npm ci`, `npm run dev` (Gateway en 3000); `npm run build` y `npm test`. Para otro Gateway define `GATEWAY_URL` antes de `npm run dev`. Con Docker, Nginx sirve el frontend en 8080 y dirige `/api` al Gateway.

El carrito y el perfil se guardan en localStorage. Esto no proporciona autenticación. No introduzcas tarjetas ni datos financieros; los pagos son simulados. La guía [SEIS-SERVICIOS-Y-REACT](../docs/SEIS-SERVICIOS-Y-REACT.md) explica el recorrido y los límites.
