# Plumkids v23 — Builder piloto

## Objetivo
Integrar el producto original Kids Builder dentro de Plumkids SIN reemplazar ni modificar las cuatro apps actuales.

## Qué incluye
- `/builder/index.html`: hub protegido de Plumkids Builder con los 10 generadores originales listados.
- `/builder/matematicas.html`: primer generador original integrado y rebrandeado.
- `/functions/builder/_middleware.js`: exige inicio de sesión + entitlement `plumkids-builder`.
- `migration-v23.sql`: crea Builder como producto INACTIVO (no vendible todavía) y lo habilita manualmente para la cuenta de prueba.
- `PATCH-MI-PLUMKIDS.txt`: pequeño cambio recomendado para mostrar Builder en Mi Plumkids cuando exista el entitlement.

## Qué NO toca
- Mercado Pago / create.js
- Webhook
- D1 existente
- LectoAventura
- MateAventura
- Memoria Mágica
- Emociones en Juego
- precios actuales
- portada pública

## Piloto
El Generador de Matemáticas conserva sus funciones originales:
- suma, resta, multiplicación y división
- tres dificultades
- 10–60 preguntas
- temas de color
- múltiples idiomas
- editar etiquetas
- mostrar respuestas
- imprimir hoja
- imprimir respuestas
- guardar como imagen

Se actualiza la marca a Plumkids Builder y se añade adaptación responsive para pantallas pequeñas.

## Orden de despliegue
1. Subir los archivos de `builder/` y `functions/builder/`.
2. Desplegar en Cloudflare.
3. Ejecutar `migration-v23.sql` en D1.
4. Aplicar el pequeño cambio de `PATCH-MI-PLUMKIDS.txt` para que aparezca la tarjeta en el panel.
5. Probar `/builder/` y `/builder/matematicas.html`.
6. Si todo está bien, integrar los otros 9 generadores en v24.

## Importante
Builder queda `active=0`, con precio 0 solo como registro técnico. No se puede comprar desde Checkout. Definiremos el precio y la presentación comercial después de validar los 10 generadores.
