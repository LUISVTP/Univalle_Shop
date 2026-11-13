# user-services

Proyecto NestJS independiente del primer avance de UnivalleShop. Consulta la [guía del código real](../../docs/GUIA-ARQUITECTURA.md) y la [demostración](../../docs/DEMOSTRACION.md).

```sh
npm ci
npm run build
npm test
npm run lint
```

Para desarrollo, copia `.env.example` a `.env`, proporciona las dependencias externas indicadas y ejecuta `npm run start:dev`. Para arrancar compilado: `node --env-file=.env dist/main.js`. `npm run start:prod` utiliza las variables del proceso, como en Docker.

La verificación global desde la raíz es `node scripts/verify.mjs`; la integración con dos Mongo temporales reales es `node scripts/integration.mjs`. Los temporales de las pruebas se preparan automáticamente con el verificador global.
