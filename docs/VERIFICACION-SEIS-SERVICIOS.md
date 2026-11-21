# Verificación de seis servicios y React

Ampliación del 20 de noviembre de 2026, realizada en el repositorio local `univalle-shop-api`, rama `feat/six-services-react`. No se modificó `main` con esta ampliación.

| Comprobación ejecutada | Resultado |
| --- | --- |
| Arquitectura | Siete aplicaciones backend: sin dependencias de Nest/Mongo en dominio/aplicación, sin imports de código entre servicios. |
| Compilación y TypeScript | Pasaron las siete aplicaciones backend y React. |
| Pruebas usuarios | 8 unitarias y 3 HTTP. |
| Pruebas catálogo | 7. |
| Pruebas pedidos | 15. |
| Pruebas Gateway | 6. |
| Pruebas pagos | 5: total autoritativo, reintento, conflicto, cancelación, validación y simulador rechazado. |
| Pruebas búsqueda | 4: normalización/filtro, actualización del índice, validación y recuperación tras fallo. |
| Pruebas recomendaciones | 4: normalización, ranking, stock, fallback y validación. |
| Pruebas React | 6: reglas de carrito, interfaz, errores de API y recorrido de checkout con APIs sustituidas y cancelación tras rechazo. |
| Total de pruebas unitarias/HTTP/interfaz | **58 pasaron**. |
| Lint backend | Pasó en las siete aplicaciones. |
| Integración `full-stack.mjs --smoke` | Pasó con siete APIs, proxy Vite y seis procesos MongoDB 8.0.17 independientes. |
| Navegador real | Catálogo adaptable, recuperar perfil, guardar intereses, recomendaciones y compra con comprobante simulado aprobado. |
| Auditoría de dependencias de producción | Pagos y React: cero vulnerabilidades reportadas. No equivale a una auditoría de seguridad de la aplicación. |
| Docker | No disponible; builds y arranque de contenedores pendientes. |
| CI GitHub Actions | Workflow añadido; su ejecución remota se comprueba en GitHub tras el push. |

La integración recorre rutas del Gateway a través del proxy del frontend y verifica: acentos, precio, caracteres regex tratados literalmente, rechazo de parámetros repetidos, intereses persistidos, sugerencias sin agotados, usuario inexistente, creación de pedido, dos pagos simultáneos que devuelven el mismo comprobante, importe obtenido de pedidos, conflicto por otra clave, consulta de pago y rechazo de pedido cancelado. Comprueba las colecciones en MongoDB separados y limpia los procesos al finalizar.

La demo que queda activa usa las mismas APIs reales y datos temporales. La prueba de navegador confirmó un pago aprobado sin cobro real. Las pruebas de componentes sustituyen el cliente HTTP; la integración y la prueba de navegador sí utilizaron las APIs y MongoDB reales.

La ampliación se comprobó localmente con Node.js 26.5.0. Las imágenes y CI están configuradas con Node.js 24. El frontend configura los workers de Vitest en Node 25+ para evitar la colisión entre el Web Storage nativo de Node y jsdom, sin alterar el almacenamiento del navegador.

Esta revisión no volvió a ejecutar las integraciones históricas con Kafka/RabbitMQ ni afirma que Docker esté validado. La demo nueva no arranca un broker; para ese circuito se conserva `integration-patterns.mjs` y su guía.
