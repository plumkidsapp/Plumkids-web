# Plumkids v25 — Visual + Responsive

## Objetivo
Actualizar la apariencia de Plumkids y corregir la experiencia móvil de las 10 apps originales, sin tocar pagos, D1, entitlements ni progreso.

## Incluye
- Nueva página de inicio completamente responsive.
- Catálogo separado en:
  - Apps para jugar (4)
  - Herramientas para crear (10)
- 10 iconos SVG propios y coherentes para los generadores originales.
- Nuevo Mi Plumkids con filtros de categoría y tarjetas más limpias.
- Capa responsive compartida para las 10 apps originales.
- Escalado visual automático de la hoja A4 en celulares, preservando la geometría original para imprimir/exportar.
- Controles móviles a ancho completo y con tamaños táctiles adecuados.
- El botón “Mi Plumkids” sigue disponible dentro de cada generador.

## Lo que NO cambia
- Mercado Pago.
- Webhook y recuperación de pagos.
- Base D1.
- Entitlements existentes.
- Las 4 apps interactivas.
- Rutas protegidas.
- Precios actuales de las 4 apps.
- Contenido y lógica funcional de los 10 generadores.

## No hay migración SQL
La v25 es exclusivamente visual y responsive. No ejecutes ningún SQL para esta versión.

## Instalación
1. Descomprime el ZIP.
2. Sube todo el contenido a la raíz del repositorio, conservando carpetas.
3. Reemplaza `index.html`, `mi-plumkids.html` y los 10 HTML de `/play/`.
4. Añade:
   - `/play/plumkids-mobile.css`
   - `/play/plumkids-mobile.js`
   - los 10 SVG nuevos de `/assets/`
5. Espera que Cloudflare Pages indique Success.
6. Abre la home y Mi Plumkids con Ctrl+F5.
7. En celular prueba las 10 herramientas en vertical.

## Prueba móvil sugerida
Comprobar especialmente anchos de 360, 390 y 412 px:
- el panel de controles debe ocupar todo el ancho;
- la hoja debe verse completa escalada bajo los controles;
- no debe haber scroll horizontal de toda la página;
- imprimir/guardar debe conservar el formato original.
