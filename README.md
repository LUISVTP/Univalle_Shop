# Univalle Shop

Monorepositorio del proyecto **Univalle Shop**: frontend y servicios backend.

## Estructura

```
Univalle_Shop/
├── frontend/                     # Aplicación frontend (pendiente)
├── services/
│   └── user-services/            # API de usuarios (NestJS + TypeScript)
│       ├── src/
│       ├── test/
│       ├── package.json
│       └── .env.example
├── .gitignore
└── README.md
```

Cada servicio es un proyecto Node.js independiente con su propio `package.json`.

## Servicios

| Servicio | Ruta | Descripción |
| --- | --- | --- |
| `user-services` | `services/user-services` | API REST de usuarios (NestJS) |

## Cómo ejecutar `user-services`

```bash
cd services/user-services
npm install
cp .env.example .env   # completa las variables
npm run start:dev
```

El servidor queda disponible en `http://localhost:3000` (o el `PORT` definido).

Comandos disponibles dentro de `services/user-services`:

```bash
npm run build       # compilar
npm run start:dev   # desarrollo con watch
npm run start:prod  # producción (requiere build)
npm run test        # pruebas unitarias
npm run test:e2e    # pruebas end-to-end
npm run lint        # oxlint
```

## Requisitos

- Node.js >= 20
- npm >= 10
- Git

## Repositorio

https://github.com/LUISVTP/Univalle_Shop
