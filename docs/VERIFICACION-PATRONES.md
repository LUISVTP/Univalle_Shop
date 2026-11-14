# Verificación de los patrones — 13 de noviembre de 2026

Código ampliado en `C:\Users\pipeb\OneDrive\Documentos\proyectos\univalle-shop-api`. La rama sigue siendo `primer-avance-hexagonal` y el último commit previo es `317d266`. Esta ampliación no tiene commit ni push. Se creó una copia del código anterior antes de modificarlo. No se incluyeron secretos en el proyecto.

## Pruebas de la ejecución final

| Comprobación | Resultado |
| --- | --- |
| Arquitectura | Pasó en cuatro proyectos: capas internas sin imports de framework/infraestructura y sin imports de código entre servicios |
| Compilación Nest | Pasó en usuarios, catálogo, pedidos y Gateway |
| TypeScript incluyendo tests | Pasó en los cuatro proyectos |
| Usuarios | 8 unitarias + 3 HTTP = 11 |
| Catálogo | 7 unitarias |
| Pedidos | 15 unitarias |
| Gateway | 6 unitarias/de adaptador |
| Total | **39 pruebas pasaron** |
| Lint | Pasó sin advertencias en la ejecución final |
| Integración previa usuarios/catálogo | Pasó nuevamente, con MongoDB real |
| Integración de patrones, Kafka | Pasó con Kafka 3.9.1 real, cuatro aplicaciones compiladas y tres MongoDB 8.0.17 reales temporales |
| Integración de patrones, RabbitMQ | Pasó con RabbitMQ 4.1.0 real sobre Erlang/OTP 27.3, las mismas cuatro aplicaciones y tres MongoDB temporales |
| Colección nueva de Postman | Se ejecutaron sus 17 peticiones HTTP y se verificaron estados y resultados clave contra la demo activa |
| npm audit | Cero vulnerabilidades reportadas en pedidos y catálogo, incluidos sus nuevos transportes; usuarios/Gateway no cambiaron dependencias en esta ampliación |
| YAML | Ambos archivos se analizaron correctamente; se comprobaron ocho servicios del stack Kafka, tres redes de bases y selección del override RabbitMQ |
| Docker | **Pendiente: no hay Docker disponible. No se ejecutaron `compose config`, builds ni contenedores** |
| EA Algorithm | Omitido por instrucción del usuario |

Las pruebas HTTP de usuarios sustituyen el puerto de persistencia; las dos integraciones sí usan bases reales. Para la colección se verificaron las peticiones con un cliente HTTP automatizado; no se operó la interfaz de Postman ni se ejecutó su Collection Runner en esta revisión.

## Qué demostró cada integración de patrones

Salida con ambos brokers:

```text
PASS chained + outbox: references checked; 202 and atomic event/outbox while broker is unreachable; read model absent
PASS real broker + CQRS + aggregator: relay recovered; two independent consumers; composed response from three services
PASS event sourcing + concurrency + idempotence: immutable history; one concurrent cancel; duplicate delivery harmless; projection deleted/rebuilt
PASS asynchronous recovery + database-per-service: catalog catches up after downtime; no shared collections
```

La prueba arranca pedidos con la dirección del broker deliberadamente inaccesible y comprueba que el evento y su marca pendiente se guardan juntos. Después reinicia pedidos con la conexión correcta y espera la actualización de ambas proyecciones. Esta prueba demuestra recuperación tras restaurar la configuración; no se presenta como una prueba de failover de un clúster de brokers.

Para reproducir reentrega se restablece `publishedAt: null` en el evento que ya llegó al broker. El relay lo vuelve a publicar y las cantidades no se duplican. Dos cancelaciones concurrentes dan un 202 y un 409. Se borra la vista y se reconstruye desde los eventos, conservando el estado cancelado y la versión 2. También se detiene catálogo, se cancela otro pedido y se comprueba que el consumidor recupera la actividad pendiente al volver.

El historial contiene `OrderCreated` y `OrderCancelled`; el evento inicial sigue describiendo el estado creado. No se modifica su payload para reflejar el estado final. Los metadatos de entrega del documento sí cambian.

## Infraestructura local usada

Kafka se descargó de Apache y se ejecutó con el Java 17 ya instalado. RabbitMQ y Erlang se extrajeron en la carpeta de trabajo: no se ejecutó un instalador ni se registró un servicio de Windows. RabbitMQ necesitó configuración local de EPMD y un cookie temporal explícito por restricciones del entorno. Las credenciales del broker de prueba se generaron fuera del repositorio; no están en el código, las guías ni la colección.

Esto proporciona evidencia de ejecución real de ambos transportes. No sustituye la validación de las imágenes Docker, el arranque Compose ni la persistencia de sus volúmenes tras recrear contenedores.

## Cómo ejecutar los controles

```powershell
node scripts/verify.mjs --install
node scripts/integration.mjs
$env:KAFKA_BROKERS='127.0.0.1:19092'
node scripts/integration-patterns.mjs
```

El último comando requiere un Kafka real accesible. Para RabbitMQ utiliza las variables indicadas en `ENTREGA-1-PATRONES.md`. La misma prueba cambia de transporte con `EVENT_TRANSPORT=rabbitmq`.

## Demo local para Postman

Con Kafka ya activo y accesible, desde la raíz:

```powershell
$env:KAFKA_BROKERS='127.0.0.1:19092'
node scripts/demo-local.mjs
```

La demo usa por defecto Gateway en `http://localhost:3100`, usuarios en 3101, catálogo en 3102 y pedidos en 3103, con tres MongoDB temporales. Puedes cambiar el puerto base mediante `DEMO_PORT`. Si los puertos están ocupados, se detiene para evitar confundirse con otro proceso.

Importa `postman/UnivalleShop-entrega1.postman_collection.json`. Con Docker completo cambia `baseUrl` a `http://localhost:3000`. Ejecuta las peticiones en orden. Las consultas pueden tardar en reflejar eventos: en Send individual hay que volver a enviar; Collection Runner tiene reintentos limitados para las proyecciones.

La demo elimina sus datos Mongo al detenerse. Detén con Ctrl+C desde la terminal que la ejecuta. No es un despliegue permanente.
