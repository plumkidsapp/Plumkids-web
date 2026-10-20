# Plumkids v15 — Sesión persistente y acceso protegido

Esta versión NO cambia los enlaces actuales de Mercado Pago. Se puede desplegar mientras Mercado Pago termina la verificación de identidad.

## Incluye

- Sesiones de 180 días.
- Renovación automática cuando quedan menos de 60 días.
- Cookie segura HttpOnly + Secure + SameSite=Lax.
- Limpieza automática de sesiones expiradas.
- `/login` y `/registro` detectan una sesión activa y llevan a Mi Plumkids.
- El portal cambia `Ingresar` por `Mi Plumkids` cuando hay sesión.
- Mi Plumkids usa las imágenes oficiales de las cuatro apps.
- El botón `Abrir app` ya apunta a `/play/...`.
- `/play/...` está protegido en el servidor por D1 `entitlements`.
- Escribir directamente la URL del juego NO evita la validación.
- Las páginas `/apps/...` siguen siendo públicas para marketing y demo.
- No requiere cambios de esquema SQL.

## Después de desplegar

Las sesiones antiguas ya vencieron. Inicia sesión una sola vez.

Prueba:
1. Ingresa a Plumkids.
2. Abre Mi Plumkids.
3. Cierra completamente Chrome.
4. Vuelve a abrir.
5. Ve a `/mi-plumkids`.
6. Debe entrar sin pedir contraseña.

Prueba de seguridad:
- Tu cuenta tiene el entitlement manual de LectoAventura.
- `https://plumkids-web.pages.dev/play/lectoaventura.html` debe abrir.
- `https://plumkids-web.pages.dev/play/mateaventura.html` debe enviarte a Mi Plumkids indicando que no está habilitada.

## Mercado Pago

La automatización de Mercado Pago permanece guardada aparte y NO se activa todavía. Los enlaces de pago actuales siguen funcionando.
