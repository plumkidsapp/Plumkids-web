-- Plumkids v23 · Builder piloto
-- Ejecutar UNA VEZ en D1 después de desplegar los archivos.

-- Crea el producto técnico, todavía NO disponible para compra pública.
INSERT OR IGNORE INTO apps
(slug,name,price_cop,price_usd_cents,active)
VALUES
('plumkids-builder','Plumkids Builder',0,0,0);

-- Habilita Builder únicamente en la cuenta de prueba.
INSERT OR IGNORE INTO entitlements
(id,user_id,app_slug,source,source_reference)
SELECT
lower(hex(randomblob(16))),
u.id,
'plumkids-builder',
'manual-beta-v23',
'BUILDER-BETA-V23'
FROM users u
WHERE u.email='gustavo.piedrahita@gmail.com';

-- Verificación:
SELECT
a.name,
e.app_slug,
e.source,
e.source_reference,
e.granted_at
FROM entitlements e
JOIN users u ON u.id=e.user_id
JOIN apps a ON a.slug=e.app_slug
WHERE u.email='gustavo.piedrahita@gmail.com'
  AND e.revoked_at IS NULL
ORDER BY a.name;
