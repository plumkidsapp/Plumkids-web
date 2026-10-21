# Plumkids v24 — 10 apps originales

Esta versión mantiene las 4 apps actuales y convierte los 10 generadores originales adquiridos en 10 apps independientes dentro de Plumkids.

## Apps nuevas
- Generador de Crucigramas — `crucigramas`
- Generador de Hojas de Vocabulario — `hojas-vocabulario`
- Generador de Laberintos — `laberintos`
- Generador de Matemáticas con Emojis — `matematicas-emojis`
- Generador de Matemáticas — `matematicas`
- Generador de Quiz del Reloj — `quiz-reloj`
- Generador de Secuencias — `secuencias`
- Generador de Sopa de Letras — `sopa-letras`
- Generador de Trazado de Formas — `trazado-formas`
- Generador de Trazos de Líneas — `trazos-lineas`

## Qué se mantiene intacto
- LectoAventura
- MateAventura
- Memoria Mágica
- Emociones en Juego
- login y sesión
- perfiles familiares
- D1
- Mercado Pago y sus webhooks
- recuperación de pagos
- progreso existente

## Cambios
- Los 10 HTML originales se publican como apps independientes bajo `/play/`.
- Cada app requiere su propio entitlement.
- Mi Plumkids muestra cada generador como una tarjeta independiente.
- La antigua tarjeta piloto `plumkids-builder` deja de mostrarse.
- La migración conserva el registro anterior y revoca solamente el entitlement beta v23; no borra datos.
- Las 10 apps nuevas quedan `active=0` y precio `0` durante la prueba. No aparecen todavía como productos públicos de pago.

## Despliegue
1. Subir el contenido del ZIP a la raíz del repositorio respetando carpetas.
2. Esperar Cloudflare Pages `Success`.
3. En D1, abrir `plumkids-db` > Console.
4. Copiar y ejecutar `migration-v24.sql`.
5. La consulta final debe mostrar las 4 apps actuales + 10 nuevas = 14 accesos activos para la cuenta de prueba.
6. Abrir Mi Plumkids y hacer Ctrl+F5.
7. Probar cada una de las 10 apps.

## Nota
No es necesario modificar Mercado Pago todavía. Primero validamos funcionalidad, impresión y descarga de las 10 apps. Después definimos precio individual, paquetes y presentación pública.
