# recommendations-service

Preferencias persistidas y recomendaciones por coincidencia de intereses.

`src/domain`: contratos y errores, sin framework. `src/application`: casos de uso. `src/infrastructure`: controladores y adaptadores HTTP/Mongo. `src/app.module.ts`: composición de dependencias con Nest.

Instalar: `npm ci`. Verificar: `npm run build`, `npm test`, `npm run lint`. Para ejecutar aisladamente, copiar `.env.example` a `.env` y configurar Mongo y los servicios relacionados; `npm run start`. No compartir bases ni importar código de otros servicios.

Para instrucciones de ejecución conjunta, endpoints, pruebas y límites: [guía de seis servicios](../../docs/SEIS-SERVICIOS-Y-REACT.md).
