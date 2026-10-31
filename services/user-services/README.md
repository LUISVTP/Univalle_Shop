# Univalle Shop API

API REST del proyecto **Univalle Shop**, construida con [NestJS](https://nestjs.com) y TypeScript.
Este repositorio contiene la migración del backend a NestJS.

## Descripción

Servicio HTTP modular basado en NestJS (módulos, controladores y servicios) con
observabilidad integrada mediante NestJS Observe: trazas distribuidas, logs
correlacionados, métricas, seguimiento de errores y alarmas.

## Tecnologías

- [NestJS 12](https://nestjs.com) (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- TypeScript 6
- Node.js 20+ (probado con Node 26)
- Express como adaptador HTTP
- [NestJS Observe](https://observe.nestjs.com) para observabilidad
- Vitest para pruebas unitarias y e2e
- Oxlint + Prettier para linting y formato

## Requisitos

- Node.js >= 20
- npm >= 10
- Git

## Instalación

```bash
npm install
```

## Variables de entorno

Las variables se cargan desde un archivo `.env` en la raíz del proyecto (los
scripts de `nest start` lo cargan con `--env-file .env`). El archivo `.env` **no**
se versiona.

1. Copia la plantilla:

   ```bash
   cp .env.example .env
   ```

2. Completa los valores:

   | Variable             | Descripción                                              | Obligatoria |
   | -------------------- | -------------------------------------------------------- | ----------- |
   | `OBSERVE_APP_KEY`    | App key de NestJS Observe                                | No          |
   | `OBSERVE_APP_SECRET` | App secret de NestJS Observe                             | No          |
   | `PORT`               | Puerto HTTP del servidor (por defecto `3000`)            | No          |

Para generar el par de llaves de Observe:

```bash
npx @nestjs/observe link
```

En producción, define `OBSERVE_APP_KEY` y `OBSERVE_APP_SECRET` como variables de
entorno del servicio en lugar de usar `.env`.

## Cómo ejecutar

```bash
# desarrollo
npm run start

# desarrollo con recarga automática (watch)
npm run start:dev

# modo debug con watch
npm run start:debug

# producción (requiere npm run build primero)
npm run build
npm run start:prod
```

El servidor queda disponible en `http://localhost:3000` (o el `PORT` definido).

### Pruebas y calidad

```bash
npm run test        # pruebas unitarias
npm run test:e2e    # pruebas end-to-end
npm run test:cov    # cobertura
npm run lint        # oxlint
npm run format      # prettier
```

## Estructura del proyecto

```
.
├── src/
│   ├── main.ts                 # Punto de entrada (bootstrap de Nest)
│   ├── app.module.ts           # Módulo raíz e instrumentación de Observe
│   ├── app.controller.ts       # Controlador principal
│   ├── app.service.ts          # Lógica de negocio
│   └── app.controller.spec.ts  # Pruebas unitarias
├── test/
│   └── app.e2e-spec.ts         # Pruebas end-to-end
├── nest-cli.json               # Configuración del CLI de Nest
├── tsconfig.json               # Configuración de TypeScript
├── tsconfig.build.json         # Configuración de build
├── vitest.config.ts            # Configuración de pruebas unitarias
├── vitest.config.e2e.ts        # Configuración de pruebas e2e
├── .env.example                # Plantilla de variables de entorno
└── package.json
```

## Observabilidad

La aplicación está instrumentada con [NestJS Observe](https://observe.nestjs.com)
a través de `ObserveModule` en `src/app.module.ts`. Para conectarla, ejecuta
`npx @nestjs/observe link` y aprueba el código que se muestra en
[observe.nestjs.com/link](https://observe.nestjs.com/link).

## Repositorio

https://github.com/LUISVTP/Univalle_Shop

## Licencia

UNLICENSED — uso interno del proyecto Univalle Shop.
