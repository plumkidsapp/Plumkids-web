# Plumkids v16 — LectoAventura MVP jugable

## Qué se agregó

### LectoAventura
- Selección de perfil infantil.
- Mundo 1: "El Bosque de las Letras".
- 5 actividades jugables:
  1. Letra A
  2. Letra M
  3. Letra S
  4. Sonido inicial
  5. Reto del bosque
- 5 preguntas por actividad.
- Voz del navegador en español para escuchar instrucciones.
- Retroalimentación inmediata.
- Puntuación 0–100.
- 1 a 3 estrellas.
- Desbloqueo secuencial.
- Repetición de actividades.
- Diseño responsive móvil/escritorio.

### Guardado
El backend crea automáticamente, si no existen:
- `child_app_progress`
- `activity_attempts`

No es obligatorio ejecutar SQL manualmente.

Se guarda:
- niño
- app
- actividad
- mejor puntaje
- estrellas
- respuestas correctas
- duración
- progreso acumulado

### Mi Plumkids
Se agregó "Progreso de aprendizaje" con:
- niño
- app
- actividades completadas
- estrellas
- puntos
- barra de progreso

## Prueba recomendada

1. Entrar con la cuenta que tiene LectoAventura.
2. Mi Plumkids → Abrir app.
3. Elegir un perfil infantil.
4. Completar "La letra A".
5. Volver al mapa: la siguiente actividad debe desbloquearse.
6. Volver a Mi Plumkids: debe aparecer el progreso.
7. Cerrar navegador, volver a entrar y abrir LectoAventura: el avance debe seguir guardado.

## Nota pedagógica
Esta es la arquitectura MVP. El contenido inicial permite validar la experiencia, el guardado y el sistema de progresión. En siguientes versiones podemos ampliar alfabetización inicial, conciencia fonológica, sílabas, palabras, comprensión e historias.
