INSERT OR IGNORE INTO apps (slug,name,price_cop,price_usd_cents,active) VALUES
('crucigramas','Generador de Crucigramas',0,0,0),
('hojas-vocabulario','Generador de Hojas de Vocabulario',0,0,0),
('laberintos','Generador de Laberintos',0,0,0),
('matematicas-emojis','Generador de Matemáticas con Emojis',0,0,0),
('matematicas','Generador de Matemáticas',0,0,0),
('quiz-reloj','Generador de Quiz del Reloj',0,0,0),
('secuencias','Generador de Secuencias',0,0,0),
('sopa-letras','Generador de Sopa de Letras',0,0,0),
('trazado-formas','Generador de Trazado de Formas',0,0,0),
('trazos-lineas','Generador de Trazos de Líneas',0,0,0);

UPDATE entitlements
SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP)
WHERE app_slug='plumkids-builder'
  AND source_reference='BUILDER-BETA-V23'
  AND revoked_at IS NULL;

INSERT OR IGNORE INTO entitlements
(id,user_id,app_slug,source,source_reference)
SELECT
lower(hex(randomblob(16))),
u.id,
a.slug,
'manual-beta-v24',
'ORIGINAL-APPS-V24'
FROM users u
JOIN apps a ON a.slug IN ('crucigramas','hojas-vocabulario','laberintos','matematicas-emojis','matematicas','quiz-reloj','secuencias','sopa-letras','trazado-formas','trazos-lineas')
WHERE u.email='gustavo.piedrahita@gmail.com';

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
