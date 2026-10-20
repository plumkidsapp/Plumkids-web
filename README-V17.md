# Plumkids v17 — Mercado Pago Orders API + Beta abierta

Flujo real:
1. Usuario inicia sesión.
2. Plumkids crea una order local en D1.
3. Backend crea Checkout Pro con POST /v1/orders y X-Idempotency-Key.
4. Mercado Pago devuelve checkout_url.
5. Usuario paga.
6. Webhook order llega a /api/payments/webhook.
7. Plumkids valida x-signature con HMAC-SHA256.
8. Plumkids consulta GET /v1/orders/{id}.
9. Solo processed + accredited, monto/moneda/referencia correctos habilitan la app.
10. La app aparece automáticamente en Mi Plumkids.

Secrets: MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET.
Verificación: /api/payments/config
Webhook producción: /api/payments/webhook
Evento: Order (Mercado Pago)

LectoAventura queda con las 5 actividades actuales abiertas durante la beta.
