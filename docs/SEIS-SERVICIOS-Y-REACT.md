# Seis microservicios y frontend React

Esta ampliación parte de `main` e incorpora pagos, búsqueda, recomendaciones y una interfaz React funcional. Es una demostración académica: no completa todas las funciones del comercio electrónico final.

## Ejecutar y probar

Requisitos locales: Node.js 24, npm y acceso a Internet en la primera instalación/descarga de MongoDB temporal. Desde la raíz del repositorio:

```powershell
node scripts/verify.mjs --install
node scripts/full-stack.mjs --smoke
node scripts/full-stack.mjs
```

El primer comando instala dependencias de siete aplicaciones backend y React, revisa arquitectura, compila, comprueba tipos, ejecuta pruebas y lint del backend. La integración `--smoke` usa siete aplicaciones reales, seis procesos MongoDB independientes y el proxy Vite; se detiene y limpia sus bases temporales al finalizar.

Sin `--smoke`, la demo permanece activa: **React http://127.0.0.1:3207**, Gateway http://127.0.0.1:3200 y servicios 3201–3206. Crea ocho productos y un usuario temporal; imprime su ID para recuperarlo en Mi perfil. También se puede registrar otro perfil. Los datos de Mongo se eliminan al terminar con Ctrl+C. El carrito y los comprobantes permanecen en localStorage; al recrear las bases utiliza Cambiar de perfil para limpiar las referencias antiguas del navegador.

Esta demo no arranca Kafka/RabbitMQ. Conserva el outbox de pedidos pendiente si no se define `KAFKA_BROKERS`. El frontend consulta el historial de eventos para leer un pedido sin depender de su proyección. Para demostrar publicación asíncrona, CQRS y agregación utiliza el stack con broker y las pruebas de `ENTREGA-1-PATRONES.md`.

Con Docker instalado:

```powershell
docker compose config
docker compose up --build -d
docker compose ps
```

Frontend http://localhost:8080; Gateway http://localhost:3000. El stack tiene seis microservicios, Gateway, React servido por Nginx, seis MongoDB y Kafka. Los volúmenes conservan los datos. La alternativa RabbitMQ continúa en `compose.rabbitmq.yaml`, con credenciales locales generadas según la guía anterior. Docker debe verificarse en un equipo que tenga el motor disponible; la ejecución local no demuestra que las imágenes hayan sido construidas.

Para desarrollar solo React: `cd frontend`, `npm ci`, `npm run dev`. Vite usa Gateway http://127.0.0.1:3000; se puede definir `GATEWAY_URL` antes de arrancarlo. El navegador siempre solicita `/api`; Vite y Nginx actúan como proxy del mismo origen. No se guardan URLs internas ni secretos en el bundle.

## Qué hace cada componente

| Componente | Carpetas y responsabilidades |
| --- | --- |
| `services/payments-service/src/domain/payment.ts` | Define transacción y los puertos `PaymentRepository`, `OrderReader`, `PaymentProcessor`. No importa Nest ni Mongo. |
| `payments-service/src/application/payments.ts` | `CreatePayment.execute` valida, busca una transacción anterior, obtiene el total de pedidos, verifica que siga creado y solicita autorización al simulador. `GetPayment` consulta el comprobante. |
| `payments-service/src/infrastructure/adapters.ts` | Mongo guarda transacciones; HTTP obtiene el último evento del pedido; `SimulatedProcessor` aprueba o rechaza sin cobrar. |
| `services/search-service/src/application/search.ts` | `SearchProducts` actualiza un índice propio, normaliza acentos y aplica palabras/precio. Actualización bajo demanda cada 30 segundos. |
| `search-service/src/infrastructure/mongo-index.ts` | Persiste el índice en `product_index`; escapa expresiones regulares antes de consultar y limita la salida a 100 resultados. |
| `services/recommendations-service/src/application/recommendations.ts` | Guarda intereses normalizados, verifica el usuario, puntúa coincidencias en el nombre y excluye agotados. Sin intereses prioriza los precios menores. Entrega hasta seis sugerencias con explicación. |
| `recommendations-service/src/infrastructure/adapters.ts` | Persiste preferencias en Mongo propio y verifica usuarios por API HTTP. |
| Cada `app.module.ts` nuevo | Es la raíz de composición: registra adaptadores y construye casos de uso mediante factories de Nest. |
| Cada `health.controller.ts` | Comprueba conectividad con su propio MongoDB. |
| Cada `infrastructure/error.filter.ts` | Traduce errores del dominio a 400, 404, 409 o 502. |
| Cada `.env.example`, `Dockerfile`, `package*.json` | Configuración sin secretos, imagen y dependencias independientes. No hay imports de código entre servicios. |
| `frontend/src/api.ts` | Contratos de la interfaz y cliente HTTP; comunica errores de la API. |
| `frontend/src/cart.ts` | Reglas del carrito local, cantidades, total y recuperación del almacenamiento. |
| `frontend/src/components.tsx` | Tarjetas, formulario de perfil y publicación de productos. |
| `frontend/src/App.tsx` | Navegación, búsqueda, preferencias, carrito y coordinación de pedidos/pagos/comprobantes. |
| `frontend/src/styles.css` | Diseño adaptable a escritorio y móvil, estados de carga/error/vacío y foco visible. |
| `frontend/vite.config.ts`, `nginx.conf` | Proxy de desarrollo y publicación de los estáticos de producción. |
| `.github/workflows/verify.yml` | Comprobaciones automáticas en pushes y pull requests; resultados pendientes hasta que GitHub ejecute el workflow. |

## Peticiones nuevas mediante Gateway

| Método y ruta | Ejemplo |
| --- | --- |
| `GET /api/search?q=café&maxPrice=20000` | Consulta el índice de búsqueda. |
| `POST /api/recommendations/:userId/preferences` | `{"keywords":["café","cuaderno"]}` |
| `GET /api/recommendations/:userId` | Sugerencias con puntuación y explicación. |
| `POST /api/payments` | `{"orderId":"UUID_DEL_PEDIDO","idempotencyKey":"clave_estable_de_8_caracteres"}` |
| `GET /api/payments/:id` | Comprobante simulado. |

Importa `postman/UnivalleShop-seis-servicios.postman_collection.json`; ejecuta sus peticiones en orden. `baseUrl` viene en http://localhost:3200 para la demo, modificable a http://localhost:3000 con Docker. La colección guarda los IDs entre peticiones y reutiliza la clave por pedido para comprobar idempotencia.

## Ejemplo para defender la arquitectura

Al confirmar una compra, React solicita `POST /api/orders` al Gateway. Pedidos valida usuario y producto mediante HTTP y guarda el evento en su Mongo. React usa ese ID en `POST /api/payments`. Gateway dirige la petición a pagos; el controlador llama a `CreatePayment`. Este caso de uso conoce contratos del dominio, sin conocer Mongoose ni controladores de Nest.

Nest inyecta `MongoPayments` como `PaymentRepository`, `HttpOrders` como `OrderReader` y `SimulatedProcessor` como `PaymentProcessor`. Cumplir el contrato significa implementar los métodos y sus comportamientos esperados: por ejemplo, `byOrder` entrega una transacción o `null`; `save` conserva una transacción única por pedido y resuelve los reintentos concurrentes. No basta con que los nombres de los métodos coincidan: las pruebas verifican el comportamiento.

El importe se obtiene del historial del pedido, nunca del importe enviado por React. Un índice único de Mongo en `orderId` evita dos comprobantes aunque lleguen peticiones simultáneas. La misma clave devuelve el comprobante anterior; otra clave para el mismo pedido responde 409. No se implementa un proveedor real: antes de hacerlo se necesitarán estados de autorización, idempotencia también en el proveedor y conciliación.

SOLID: controladores, reglas y persistencia tienen responsabilidades separadas; los puertos permiten sustituir adaptadores; los casos de uso dependen de abstracciones pequeñas. El simulador se reemplaza implementando `PaymentProcessor`, manteniendo el contrato. Los puertos de lectura y escritura se separan cuando requieren capacidades diferentes.

## Recorrido de exposición

1. Arrancar `node scripts/full-stack.mjs`; abrir React y mostrar catálogo, búsqueda con acentos y filtro por precio.
2. Recuperar el ID impreso en Mi perfil; guardar intereses como `café, cálculo`. Volver a Explorar y observar sugerencias explicadas.
3. Agregar un producto al carrito, ajustar cantidad y confirmar compra simulada. Mostrar comprobante y consultar estado.
4. Mostrar `POST /api/payments` repetido en Postman con la misma clave y el mismo ID de transacción. Otra clave para ese pedido produce 409.
5. Ejecutar `node scripts/full-stack.mjs --smoke` por separado al finalizar la demo: muestra búsqueda, preferencias, importe autoritativo, concurrencia, cancelación y persistencia independiente.
6. Enseñar puertos, caso de uso, adaptador y provider de Nest con el ejemplo anterior. Mostrar los resultados de `verify.mjs` y los jobs de GitHub Actions.

## Límites reales

- Pagos son simulados: `SIMULATED_PAYMENT_OUTCOME=declined` permite probar rechazos. No hay tarjetas, cobros, reembolsos, webhooks ni conciliación. Cada pedido admite una transacción; un rechazo no crea nuevos intentos.
- Perfil recuperado por ID no es autenticación. Faltan login, verificación de correo, roles y autorización. Estas APIs y el frontend son para una demo local, no para usuarios reales.
- El carrito está en el navegador y cada línea crea un pedido independiente. Comprobantes locales no equivalen a historial por usuario en el servidor. No hay reserva/descuento de inventario ni checkout transaccional del carrito.
- Pagos consulta si el pedido está cancelado antes de registrar la simulación, pero no coordina de forma atómica cancelación y pago entre servicios. El backend todavía permite cancelar por API un pedido con un comprobante; faltan las reglas de una saga de compra y reembolso. React no ofrece esa cancelación después de un pago aprobado; permite cancelar pedidos con pagos rechazados.
- Recomendaciones usa reglas explicables basadas en palabras, no aprendizaje automático. Búsqueda sincroniza como máximo los primeros 100 productos del catálogo actual; faltan paginación y sincronización por eventos para escalar o manejar edición/eliminación concurrentes.
- React es una aplicación única modular; no se implementó composición de microfrontends independientes.
- Continúan pendientes las funciones completas de catálogo y perfiles, SDD, evidencias de Jira y la continuidad de avances semanales reales. Esta ampliación no inventa entregas de semanas anteriores.
