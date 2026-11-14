> **Ampliación Entrega 1 (13/11/2026):** se incorporó pedidos demostrativos con Aggregator, Chained, CQRS, Event Sourcing, outbox y transportes Kafka/RabbitMQ. Consulta [la guía actualizada](docs/ENTREGA-1-PATRONES.md) y [la verificación](docs/VERIFICACION-PATRONES.md). Las secciones inferiores conservan la descripción de la base inicial. No incluye frontend ni pagos.

# UnivalleShop â€” primer avance

Base de microservicios REST con NestJS, TypeScript, MongoDB y arquitectura hexagonal. Conserva y completa el servicio de usuarios original; aÃ±ade catÃ¡logo mÃ­nimo y API Gateway. No incluye todavÃ­a frontend React ni el e-commerce completo.

```text
services/
  user-services/       # registro, hash y Mongo exclusivo
  catalog-service/     # crear/listar productos y Mongo exclusivo
  api-gateway/         # entrada pÃºblica REST, sin base de datos
scripts/               # arquitectura, verificaciÃ³n e integraciÃ³n real
docs/                  # diagnÃ³stico, explicaciÃ³n y demostraciÃ³n
compose.yaml           # tres aplicaciones y dos MongoDB
```

Cada servicio tiene su propio manifiesto, lockfile, configuraciÃ³n y Dockerfile. No importa cÃ³digo ni modelos de otro servicio.

## Ejecutar con Docker

Requiere Docker Engine/Desktop activo con Compose v2 y contenedores Linux.

```sh
docker compose config
docker compose up --build -d --wait
docker compose ps
```

Entrada: `http://localhost:3000`. Solo se publica el Gateway en la interfaz local. Mongo no publica puertos. Esta configuraciÃ³n es de desarrollo, con bases sin autenticaciÃ³n aisladas en redes internas.

| MÃ©todo | Ruta pÃºblica | Resultado |
| --- | --- | --- |
| GET | `/health` | Salud del proceso Gateway |
| POST | `/api/users` | Registro: 201; datos invÃ¡lidos: 400; correo duplicado: 409 |
| POST | `/api/products` | Crear producto: 201; datos invÃ¡lidos: 400 |
| GET | `/api/products` | Lista de hasta 100 productos: 200 |

Entrada de registro: `name`, `email`, `password` (12 a 128 caracteres). Dominio permitido configurable mediante `ALLOWED_EMAIL_DOMAIN`; por defecto `correounivalle.edu.co`. Esto valida el formato institucional, no acredita pertenencia ni implementa autenticaciÃ³n.

Entrada de producto: `name`, `price` positivo y `stock` entero no negativo.

## Compilar y probar sin Docker

Node 24 o superior, npm y acceso de red para la instalaciÃ³n. EjecuciÃ³n local comprobada con Node 26.5.0 y npm 11.17.0.

```sh
node scripts/verify.mjs --install
node scripts/integration.mjs
```

El primer comando instala cada proyecto con `npm ci`, comprueba dependencias arquitectÃ³nicas, compila, comprueba tipos, ejecuta pruebas y lint. Sin `--install` reutiliza las dependencias instaladas.

El segundo lanza dos MongoDB temporales reales y tres aplicaciones compiladas. La primera vez descarga el binario MongoDB (en Windows aproximadamente 756 MB); no requiere una base instalada, no usa una base existente y elimina los datos de prueba al terminar. Comprueba tambiÃ©n independencia ante caÃ­das y reinicio de catÃ¡logo.

Para ejecutar servicios manualmente, instala/compila cada uno, copia su `.env.example` a `.env`, ajusta sus URLs y ejecuta `npm run start:dev`. Los ejemplos esperan Mongo usuarios en `127.0.0.1:27017` y catÃ¡logo en `127.0.0.1:27018`: debes proporcionar esas instancias. El Compose principal no expone esos puertos. Los puertos HTTP locales de ejemplo son 3001, 3002 y 3000 respectivamente.

## Material de estudio y evidencia

- [DiagnÃ³stico del cÃ³digo original](docs/DIAGNOSTICO.md).
- [GuÃ­a de carpetas, mÃ©todos, puertos, DI, SOLID y recorrido HTTP â†’ Mongo](docs/GUIA-ARQUITECTURA.md).
- [DemostraciÃ³n para la sustentaciÃ³n](docs/DEMOSTRACION.md).
- [Resultados y lÃ­mites de la verificaciÃ³n](docs/VERIFICACION.md).

No se hizo push. No hay secretos en los ejemplos. Las llaves de Observe son opcionales y deben mantenerse fuera de Git. El cambio de `password` a `passwordHash` requiere migraciÃ³n/restablecimiento si ya existen usuarios almacenados; no conectes una base anterior sin revisarlo.
