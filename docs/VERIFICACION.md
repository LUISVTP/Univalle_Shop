# Evidencia de verificación — primer avance

Fecha local: 12 de noviembre de 2026 (America/Bogota). Base inspeccionada: commit `b488403` del repositorio original. Cambios locales sin commit ni push.

Entorno: Windows, Node.js 26.5.0, npm 11.17.0, MongoDB 8.0.17 descargado para pruebas temporales. Docker no está disponible en la terminal. Las imágenes propuestas usan Node 24 y Mongo 8.0; todavía deben ejecutarse en Docker.

## Resultados finales

| Comprobación | Resultado |
| --- | --- |
| `node scripts/check-architecture.mjs` | Pasa: capas internas sin imports externos ni de infraestructura; sin imports relativos entre servicios |
| `npm run build` por servicio | Usuarios, catálogo y Gateway compilan |
| `tsc --noEmit --incremental false` por servicio | Pasa, incluyendo archivos de pruebas |
| Unitarias usuarios | 8 pasan: prueba original y 7 de caso de uso/hash |
| HTTP usuarios con persistencia sustituida | 3 pasan: 201, 400, 409 |
| Unitarias catálogo | 6 pasan |
| Adaptador HTTP Gateway | 3 pasan: respuesta conservada, timeout, conexión fallida |
| Total Vitest | 20 pruebas pasan |
| `npm run lint` por servicio | Pasa sin advertencias en la ejecución final |
| `node scripts/integration.mjs` | Pasa con código compilado y dos procesos Mongo reales; termina con código 0 y cierra los procesos |
| `npm audit` y `npm audit --omit=dev` por servicio | Cero vulnerabilidades reportadas en esta revisión |
| `git diff --check` | Sin errores de espacios; Git solo avisa normalización CRLF/LF en archivos de texto |
| Sintaxis YAML y aislamiento estático | Pasa: cinco servicios, redes Mongo separadas, únicamente Gateway publica puerto en loopback |
| `docker compose config`, build y ejecución | **Pendiente: Docker no instalado/accesible en este entorno** |

La comprobación estática del YAML se ejecutó con PyYAML en herramientas temporales fuera del repositorio. No sustituye la validación del modelo por Compose.

## Integración real

Salida de la ejecución final:

```text
PASS users: 201, 400, 409, concurrent uniqueness, stored hash, safe response
PASS catalog: 201, 400, 200, real persistence, isolated databases
PASS independence: either service can stop; the other remains usable; restart preserves products
Integration passed: three compiled processes + two real ephemeral mongod instances.
```

La prueba confirma que el índice único ya existe tras arrancar usuarios; no lo crea por su cuenta para ocultar un error de inicialización. Envía dos registros simultáneos al Gateway y espera exactamente un 201 y un 409. Lee Mongo para verificar hash y ausencia de contraseña original. Consulta ambas bases para comprobar que no comparten las colecciones. Detiene un servicio y comprueba que el otro sigue atendiendo por el mismo Gateway. Reinicia catálogo y vuelve a leer el producto sobre el mismo Mongo temporal.

Los puertos de prueba se asignan dinámicamente y los datos se eliminan al cerrar las instancias. Esto no demuestra conservación de volúmenes de Docker después de `compose down`; esa comprobación tiene su propio guion en `DEMOSTRACION.md`.

## Ajustes surgidos de la ejecución

- Los temporales del entorno Windows restringido provocaban errores de permisos; el verificador y la integración usan `.tmp` dentro del repositorio, ignorado por Git.
- Una importación de `Connection` compilaba pero fallaba al arrancar con ESM porque Mongoose no lo exportaba como valor. Se cambió a `import type`; la integración final confirma el arranque real.
- Se espera `model.init()` antes de servir peticiones de registro, para disponer del índice único desde el inicio.
- Se corrigió la limpieza de procesos para reconocer procesos terminados por señal además de código de salida.
- Se quitó la herramienta de despliegue `@nestjs/mau` y su script asociado, no utilizados por este avance Docker, y se actualizaron dependencias compatibles mediante `npm audit fix`. Se conservaron las versiones mayores de Nest/TypeScript del proyecto. Los tres lockfiles quedan incluidos.

## Cómo repetir

Desde la raíz del repositorio:

```sh
node scripts/verify.mjs --install
node scripts/integration.mjs
```

Luego, en un equipo con Docker activo:

```sh
docker compose config
docker compose up --build -d --wait
docker compose ps
```

Completa el guion de caída/reinicio y volúmenes de `DEMOSTRACION.md`. No se necesita ningún push para ejecutar este avance.
