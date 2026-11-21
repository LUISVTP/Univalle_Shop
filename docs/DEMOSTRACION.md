# Guion de demostración ante el profesor

## Preparación

Abre una terminal en la raíz del repositorio. Necesitas Docker Desktop/Engine con contenedores Linux y Compose v2. Esta parte quedó preparada, pero no se ejecutó en el entorno de desarrollo porque Docker no estaba disponible. Compruébala en tu equipo antes de presentar.

```powershell
docker compose config
docker compose up --build -d --wait
docker compose ps
```

Deben aparecer cinco servicios: `users-mongo`, `catalog-mongo`, `users`, `catalog` y `gateway`. `compose config` valida el modelo Compose; `up` debe construir y arrancar las imágenes. Si falla, revisa `docker compose logs users catalog gateway`. No necesitas crear un `.env` para estos valores locales.

## Registro y validación

Los siguientes datos son ficticios y se generan para la demostración; no representan una cuenta real. El sufijo único evita duplicados al repetir la presentación.

```powershell
$demoSuffix = [guid]::NewGuid().ToString('N').Substring(0, 8)
$demoUser = @{
  name = 'Estudiante Demo'
  email = "demo.$demoSuffix@correounivalle.edu.co"
  password = "Demo-$demoSuffix-2026!"
} | ConvertTo-Json

Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/api/users -Method Post -ContentType 'application/json' -Body $demoUser
```

Resultado esperado: 201, con `id`, `name`, `email` y `createdAt`, sin contraseña ni hash. Para ver encabezados/estado usa `Invoke-WebRequest` o Postman.

Repite exactamente el registro y muestra 409. Cambia el correo a `demo@gmail.com` y muestra 400. PowerShell genera una excepción ante respuestas 4xx; la respuesta HTTP sigue siendo la esperada. En Postman es más fácil mostrar estado y cuerpo sin ese comportamiento de la terminal.

Muestra la persistencia sin imprimir el hash:

```powershell
docker compose exec users-mongo mongosh users --quiet --eval 'db.users.find({}, {name:1,email:1,createdAt:1}).toArray()'
docker compose exec users-mongo mongosh users --quiet --eval 'db.users.countDocuments({passwordHash:{$exists:true},password:{$exists:false}})'
docker compose exec users-mongo mongosh users --quiet --eval 'db.users.getIndexes()'
```

Explica que Mongo impone la unicidad de correo y el caso de uso normaliza antes de guardar. La contraseña se transforma con scrypt y sal aleatoria. No existe login aún.

## Catálogo y base independiente

```powershell
$demoProduct = @{name='Libro Desarrollo de Software 3'; price=15000; stock=3} | ConvertTo-Json
Invoke-RestMethod http://localhost:3000/api/products -Method Post -ContentType 'application/json' -Body $demoProduct
Invoke-RestMethod http://localhost:3000/api/products
docker compose exec catalog-mongo mongosh catalog --quiet --eval 'db.products.find().toArray()'
docker compose exec users-mongo mongosh users --quiet --eval 'db.getCollectionNames()'
docker compose exec catalog-mongo mongosh catalog --quiet --eval 'db.getCollectionNames()'
```

Resultado esperado: creación 201 y listado 200. Usuarios tiene su colección `users`; catálogo, `products`. Son servidores, bases, redes y volúmenes distintos. No hay joins ni importaciones de modelos entre servicios.

## Demostrar independencia ante una caída

```powershell
docker compose stop catalog
Invoke-WebRequest http://localhost:3000/api/products
```

La consulta debe responder 502 porque el servicio está detenido. Registra otro correo único: usuarios debe seguir devolviendo 201. Luego:

```powershell
docker compose start catalog
docker compose ps
Invoke-RestMethod http://localhost:3000/api/products
```

Espera a que catálogo vuelva a estar saludable antes de consultar. El producto debe seguir allí. Puedes invertir la prueba deteniendo usuarios: catálogo debe continuar listando.

## Demostrar persistencia de volúmenes

```powershell
docker compose down
docker compose up -d --wait
Invoke-RestMethod http://localhost:3000/api/products
```

Los productos deben conservarse porque `down` sin `-v` conserva los volúmenes. Esta prueba debe ejecutarse en Docker; el test de integración local solo comprueba reinicio del proceso del catálogo sobre el mismo Mongo temporal.

## Explicar el código en cinco minutos

1. Abre `UserRepository` y `PasswordHasher`: son contratos sin Nest/Mongo.
2. Abre `CreateUserUseCase.execute()`: valida, obtiene hash y pide guardar. No crea conexiones.
3. Abre `UserMongoRepositoryAdapter.SaveUser()`: aquí se usa Mongoose y se traduce error 11000.
4. Abre `UserModule`: explica `provide`, `useClass`, `useFactory` e `inject`.
5. Abre el controlador: la respuesta se construye expresamente sin campos sensibles.
6. Muestra catálogo y Gateway como proyectos compilables por separado; abre `compose.yaml` para enseñar sus dos Mongo.
7. Ejecuta la verificación automatizada:

```powershell
node scripts/verify.mjs
node scripts/integration.mjs
```

La primera ejecución requiere dependencias; usa `node scripts/verify.mjs --install` si no están instaladas. El segundo comando descarga Mongo en su primera ejecución; ejecútalo antes de la presentación.

## Preguntas que debes poder responder

- **¿Por qué usar un puerto si siempre usamos Mongo?** Porque el caso de uso expresa lo que necesita; la tecnología queda reemplazable. La prueba con repositorio falso es una demostración concreta.
- **¿Quién decide qué implementación se usa?** El módulo Nest en la infraestructura de composición, por proveedores.
- **¿Qué pasa con dos registros simultáneos?** La normalización y el índice único impiden dos correos iguales; uno devuelve 201 y el otro 409. Hay una comprobación automatizada con Mongo real.
- **¿Por qué separar bases?** Cada servicio controla su esquema, conexión, almacenamiento y ciclo de vida. El otro debe comunicarse por API, no leer colecciones ajenas.
- **¿Ya es una tienda exclusiva de la Universidad?** Aún falta comprobar el control del correo e implementar login/permisos. El primer avance establece arquitectura y registro con política de dominio configurable.
- **¿Qué se verificó realmente?** Consulta `VERIFICACION.md`; distingue compilación, tests con dobles, integración real y Docker pendiente.
