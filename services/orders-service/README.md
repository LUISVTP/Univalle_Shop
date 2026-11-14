# Pedidos de demostración — Entrega 1

NestJS independiente con dominio/aplicación puros, comandos, eventos, consultas y outbox atómico embebido en los documentos de eventos. Los consumidores actualizan una proyección local y actividad en catálogo. No cobra ni reserva inventario.

Ver [guía de patrones](../../docs/ENTREGA-1-PATRONES.md) y `.env.example`.

```sh
npm ci
npm run build
npm test
npm run lint
```

El arranque necesita MongoDB propio y URLs HTTP de usuarios/catálogo. El broker puede estar temporalmente caído: se guardan eventos pendientes, pero las vistas no avanzan hasta recuperar la entrega. `GET /health` comprueba MongoDB; no afirma que no haya retraso de proyección.
