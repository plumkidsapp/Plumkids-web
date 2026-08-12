# Plumkids v11 — Mi Plumkids

Esta versión añade el módulo de cuentas familiares y deja lista la base para activar automáticamente la app comprada.

## Incluye
- `registro.html`: cuenta del padre/acudiente.
- `login.html`: inicio de sesión.
- `mi-plumkids.html`: panel Mis apps + perfiles infantiles.
- `/functions`: API con Cloudflare Pages Functions.
- `schema.sql`: esquema para Cloudflare D1.
- Sesiones con cookie HttpOnly, Secure y SameSite=Lax.
- Contraseñas derivadas con PBKDF2-SHA256 y salt aleatorio.
- Tablas para usuarios, sesiones, niños, apps, pagos y derechos de acceso (`entitlements`).

## Configuración en Cloudflare
1. Crear una base D1, por ejemplo `plumkids-db`.
2. Ejecutar `schema.sql` en esa base.
3. Abrir el proyecto `plumkids-web` en Cloudflare Pages.
4. Ir a **Settings → Bindings → Add → D1 database**.
5. Variable name: `DB`.
6. Seleccionar `plumkids-db`.
7. Guardar y volver a desplegar.

## Prueba
- `/api/health` debe devolver `{"ok":true,"db":true}`.
- Crear cuenta en `/registro.html`.
- Entrar a `/mi-plumkids.html`.
- Agregar un perfil infantil.

## Pendiente siguiente
Mercado Pago: pago aprobado → identificar cuenta → insertar `entitlements` → la app aparece en Mis apps.
