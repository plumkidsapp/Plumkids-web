import{json,currentUser,uuid}from'../../lib/auth.js';

function safeText(value,max=4000){
  const s=String(value??'');
  return s.length>max?s.slice(0,max):s;
}

export async function onRequestPost(context){
  const{request,env}=context;

  if(!env.DB)return json({error:'Base de datos no configurada.'},500);
  if(!env.MP_ACCESS_TOKEN)return json({error:'Mercado Pago no está configurado.'},503);

  const user=await currentUser(request,env);
  if(!user)return json({error:'Debes iniciar sesión antes de comprar.'},401);

  let body;
  try{body=await request.json()}
  catch{return json({error:'Solicitud inválida.'},400)}

  const appSlug=String(body.appSlug||'').trim();

  const app=await env.DB.prepare(
    'SELECT slug,name,price_cop,active FROM apps WHERE slug=? AND active=1'
  ).bind(appSlug).first();

  if(!app)return json({error:'Aplicación no disponible.'},404);

  const owned=await env.DB.prepare(
    `SELECT id FROM entitlements
     WHERE user_id=? AND app_slug=? AND revoked_at IS NULL`
  ).bind(user.id,app.slug).first();

  if(owned)return json({
    error:'Esta aplicación ya está habilitada en tu cuenta.',
    already_owned:true
  },409);

  const localOrderId=uuid();
  const amount=Number(app.price_cop);
  const amountString=String(Math.round(amount));

  await env.DB.prepare(
    `INSERT INTO payments
     (id,provider,user_id,app_slug,amount,currency,status,payer_email)
     VALUES(?,?,?,?,?,?,?,?)`
  ).bind(
    localOrderId,'mercadopago-orders',user.id,app.slug,
    amount,'COP','creating',user.email
  ).run();

  // Diagnostic v19: exact minimal payload from Mercado Pago Checkout Pro Orders docs.
  const orderPayload={
    type:'online',
    processing_mode:'manual',
    total_amount:amountString,
    external_reference:localOrderId,
    payer:{
      email:user.email
    },
    config:{
      online:{
        success_url:`https://plumkids-web.pages.dev/pago-resultado.html?estado=aprobado&order=${encodeURIComponent(localOrderId)}`,
        failure_url:`https://plumkids-web.pages.dev/pago-resultado.html?estado=fallido&order=${encodeURIComponent(localOrderId)}`,
        pending_url:`https://plumkids-web.pages.dev/pago-resultado.html?estado=pendiente&order=${encodeURIComponent(localOrderId)}`,
        auto_return:'all'
      }
    },
    items:[{
      title:app.name,
      unit_price:amountString,
      quantity:1
    }]
  };

  try{
    const mp=await fetch('https://api.mercadopago.com/v1/orders',{
      method:'POST',
      headers:{
        'Accept':'application/json',
        'Authorization':`Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type':'application/json',
        'X-Idempotency-Key':localOrderId
      },
      body:JSON.stringify(orderPayload)
    });

    // Read the raw body first so we can diagnose non-JSON Mercado Pago responses.
    const raw=await mp.text();

    let result={};
    try{result=raw?JSON.parse(raw):{}}
    catch{result={}}

    if(!mp.ok||!result.id||!result.checkout_url){
      const diagnostic={
        http_status:mp.status,
        status_text:mp.statusText||null,
        content_type:mp.headers.get('content-type')||null,
        request_id:mp.headers.get('x-request-id')||null,
        raw_response:safeText(raw),
        parsed_error:result?.error??null,
        parsed_message:result?.message??null,
        parsed_code:result?.code??null,
        parsed_status:result?.status??null,
        parsed_details:result?.details??null,
        parsed_cause:result?.cause??null,
        request_summary:{
          type:orderPayload.type,
          processing_mode:orderPayload.processing_mode,
          total_amount:orderPayload.total_amount,
          external_reference:orderPayload.external_reference,
          payer_email:user.email,
          item_title:app.name,
          item_unit_price:amountString,
          item_quantity:1,
          return_urls_configured:true
        }
      };

      await env.DB.prepare(
        `UPDATE payments
         SET status='order_error',
             raw_payload=?,
             updated_at=CURRENT_TIMESTAMP
         WHERE id=?`
      ).bind(JSON.stringify(diagnostic),localOrderId).run();

      console.error('MP_ORDER_CREATE_ERROR',diagnostic);

      return json({
        error:'Mercado Pago rechazó la creación del pago.',
        http_status:mp.status
      },502);
    }

    await env.DB.prepare(
      `UPDATE payments
       SET provider_payment_id=?,
           status=?,
           raw_payload=?,
           updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind(
      String(result.id),
      String(result.status||'created'),
      JSON.stringify({
        order_id:result.id,
        status:result.status,
        status_detail:result.status_detail,
        external_reference:result.external_reference,
        total_amount:result.total_amount,
        total_paid_amount:result.total_paid_amount,
        currency:result.currency,
        country_code:result.country_code,
        created_date:result.created_date
      }),
      localOrderId
    ).run();

    return json({
      ok:true,
      order_id:localOrderId,
      mp_order_id:String(result.id),
      checkout_url:result.checkout_url
    },201);

  }catch(err){
    const diagnostic={
      exception:true,
      name:err?.name||'Error',
      message:err?.message||String(err)
    };

    await env.DB.prepare(
      `UPDATE payments
       SET status='order_exception',
           raw_payload=?,
           updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind(JSON.stringify(diagnostic),localOrderId).run();

    return json({error:'No fue posible conectar con Mercado Pago.'},502);
  }
}
