# Diagnóstico del repositorio original

Inspección: 12 de noviembre de 2026, commit `b488403` (`merge: modulo user con arquitectura hexagonal`). Se descargó el repositorio indicado porque la carpeta inicialmente abierta no contenía código ni `.git`. Esta copia conserva su historial. No se hizo push.

| Área | Evidencia original | Evaluación |
| --- | --- | --- |
| Servicios | Solo `services/user-services`, con manifiesto y lockfile propios | Buena base para despliegue independiente; todavía no se podía demostrar colaboración entre servicios |
| Dominio | `User` y puerto abstracto `UserRepository` | Sin dependencias de Nest/Mongo; separación inicial correcta |
| Aplicación | `CreateUserUseCase` con `@Injectable()` y `SaveUser` | Dependía de NestJS; no validaba datos ni protegía contraseña |
| Infraestructura | Esquema Mongoose y `UserMongoRepositoryAdapter` | Mapeo entidad/documento existente y aprovechable; guardaba contraseña en texto; correo sin índice único |
| Entrada HTTP | `AppController` expone únicamente `GET /` | Registro no accesible por HTTP; no existía controlador de usuarios |
| Composición | `UserModule` asociaba el puerto con el adaptador mediante `useClass` | Inversión de dependencias parcialmente aplicada |
| Configuración | URI MongoDB requerida; Observe configurado con valores ficticios por defecto | Conservar variables de entorno; hacer telemetría opcional sin llaves ficticias |
| Pruebas | Una unitaria y una e2e de “Hello World!” | Sin evidencia de persistencia, reglas de negocio ni independencia |
| Gateway, catálogo y Docker | Ausentes | Faltaban para el alcance del avance |
| Frontend y otros servicios | Ausentes | Se mantienen pendientes, de acuerdo con el alcance solicitado |

Comprobación inicial: `npm ci` y `npm run build` pasaron con Node 26.5.0 y npm 11.17.0. El primer intento de Vitest falló por permisos en el temporal del entorno; al dirigir `TEMP`/`TMP` al proyecto, pasó la prueba unitaria existente. La e2e original importaba `AppModule`, por lo que requería MongoDB; no se toma como evidencia de una conexión verificada. La compilación por sí sola tampoco demuestra ejecución: una importación ESM incorrecta puede compilar y fallar al arrancar.

Decisiones incrementales: conservar el nombre y ubicación del servicio de usuarios, entidad, puerto `SaveUser`, caso de uso, módulo, adaptador, esquema y endpoint original. Modificar sus responsabilidades puntualmente. Incorporar un catálogo pequeño para demostrar independencia con un segundo contexto; incorporar Gateway como proyecto autónomo. Evitar paquetes compartidos entre servicios en esta etapa.

El campo persistido pasa de `password` a `passwordHash`. Si existe una base anterior con datos reales, hace falta un plan de migración y restablecimiento de contraseñas antes de apuntar esta versión a ella. No se abrió ni modificó ninguna base existente. Antes de crear el índice único también deben corregirse correos duplicados preexistentes; el servicio falla al iniciar si MongoDB no puede crear ese índice.
