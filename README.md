# UnivalleShop

Tienda universitaria de demostración para Desarrollo de Software 3: **seis microservicios NestJS, API Gateway, MongoDB independiente por servicio y frontend React con TypeScript**. Capas de dominio, aplicación e infraestructura, puertos y adaptadores.

| Aplicación | Funcionalidad disponible |
| --- | --- |
| `services/user-services` | Registro con correo institucional, hash de contraseña y consulta de perfil. |
| `services/catalog-service` | Crear, listar y consultar productos; consumidor de actividad de pedidos. |
| `services/orders-service` | Crear/cancelar pedidos, historial de eventos y reconstrucción de vistas CQRS. |
| `services/payments-service` | Pagos **simulados**, importe obtenido de pedidos e idempotencia por pedido. |
| `services/search-service` | Índice Mongo propio, búsqueda sin distinción de acentos y filtro de precio. |
| `services/recommendations-service` | Intereses persistidos y sugerencias con razones explicables. |
| `services/api-gateway` | Entrada REST `/api`, enrutamiento y agregación del resumen de pedidos. |
| `frontend` | React: catálogo, búsqueda, publicación, perfil de demo, recomendaciones, carrito y comprobantes locales. |

## Probar localmente

Con Node.js 24 y npm, desde la raíz:

```powershell
node scripts/verify.mjs --install
node scripts/full-stack.mjs --smoke
node scripts/full-stack.mjs
```

El último comando mantiene una demo en **http://127.0.0.1:3207** y Gateway en http://127.0.0.1:3200. Crea productos y seis MongoDB temporales; imprime el ID del perfil de prueba. Recupera ese ID en Mi perfil o registra otro usuario. Ctrl+C detiene los procesos y elimina las bases temporales. El carrito y los comprobantes se guardan solo en este navegador.

La demo local permite comprobar React y los seis servicios sin broker: pedidos conserva el outbox pendiente y la interfaz consulta los eventos. Para comprobar el circuito asíncrono completo se necesita Kafka o RabbitMQ, según la guía de patrones.

## Docker Compose

```powershell
docker compose config
docker compose up --build -d
docker compose ps
```

Frontend http://localhost:8080; Gateway http://localhost:3000. El stack declara 15 contenedores: seis servicios, seis MongoDB, Gateway, Kafka y frontend/Nginx. Cada base tiene volumen y red propios. No se exponen los puertos de MongoDB.

**Pendiente validar Docker real:** en el equipo de desarrollo no hay motor Docker disponible. Los archivos preparados y la ejecución directa con MongoDB no sustituyen construir y arrancar las imágenes.

La alternativa RabbitMQ está en `compose.rabbitmq.yaml`. Ejecuta `node scripts/create-rabbit-env.mjs` para generar credenciales locales ignoradas por Git; sigue la guía antes de usar el override. No subas archivos `.env`.

## Documentación y demostración

- [Seis servicios y React: instalación, código explicado, recorrido y límites](docs/SEIS-SERVICIOS-Y-REACT.md).
- [Verificación de esta ampliación](docs/VERIFICACION-SEIS-SERVICIOS.md).
- [Postman: recorrido por los seis servicios](postman/UnivalleShop-seis-servicios.postman_collection.json).
- [Patrones del primer avance: Aggregator, Chained, CQRS, Event Sourcing, Outbox, Kafka y RabbitMQ](docs/ENTREGA-1-PATRONES.md).
- [Pruebas históricas de patrones](docs/VERIFICACION-PATRONES.md).
- [Guía de arquitectura hexagonal](docs/GUIA-ARQUITECTURA.md) y [diagnóstico inicial](docs/DIAGNOSTICO.md).

`scripts/verify.mjs` comprueba las siete aplicaciones backend y React. `.github/workflows/verify.yml` ejecuta compilación, tipos y pruebas en pushes/pull requests; los resultados de GitHub deben consultarse después de su ejecución.

## Alcance y pendientes

Los pagos no cobran dinero ni reciben tarjetas. La recuperación del perfil por ID no autentica al usuario: faltan login, verificación de correo, roles y autorización. El carrito es local, crea un pedido por producto y no reserva inventario. Faltan historial completo por usuario, categorías/imágenes, gestión completa de perfiles y una saga que coordine pago, cancelación e inventario. React es una aplicación modular única, sin composición de microfrontends independientes.

Búsqueda sincroniza bajo demanda cada 30 segundos hasta 100 productos del catálogo actual; recomendaciones utiliza coincidencias de palabras. Las guías señalan los límites y lo necesario para evolucionar estas implementaciones. También siguen pendientes SDD, evidencias de Jira y continuidad semanal de los avances reales de cada microservicio.
