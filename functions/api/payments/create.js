import{json,currentUser,uuid}from'../../lib/auth.js';

const APP_BASE='https://plumkids-web.pages.dev';

function safeMpError(result,status){
  return {
    http_status:status,
    error:result?.error??null,
    message:result?.message??null,
    code:result?.code??null,
    status:result?.status??null,
    details:result?.details??null,
    cause:result?.cause??null
  };
}

export async function onRequestPost(context){
  const{request,env}=context;

  if(!env.DB)return json({error:'Base de datos no configurada.'},500);
  if(!env.MP_ACCESS_TOKEN)return json({error:'Mercado Pago no está configurado.'},503);

  const user=await currentUser(request,env);
  if(!user)return json({error:'Debes iniciar sesión antes de comprar.'},401);

  let body;
  try{
    body=await request.json();
  }catch{
    return json({error:'Solicitud inválida.'},400);
  }

  const appSlug=String(body.appSlug||'').trim();

  const app=await env.DB.prepare(
    'SELECT slug,name,price_cop,active FROM apps WHERE slug=? AND active=1'
  ).bind(appSlug).first();

  if(!app)return json({error:'Aplicación no disponible.'},404);

  const owned=await env.DB.prepare(
    `SELECT id FROM entitlements
     WHERE user_id=? AND app_slug=? AND revoked_at IS NULL`
  ).bind(user.id,app.slug).first();

  if(owned){
    return json({
      error:'Esta aplicación ya está habilitada en tu cuenta.',
      already_owned:true
    },409);
  }

  const localOrderId=uuid();
  const amount=Number(app.price_cop);
  const amountString=amount.toFixed(2);

  await env.DB.prepare(
    `INSERT INTO payments
     (id,provider,user_id,app_slug,amount,currency,status,payer_email)
     VALUES(?,?,?,?,?,?,?,?)`
  ).bind(
    localOrderId,
    'mercadopago-orders',
    user.id,
    app.slug,
    amount,
    'COP',
    'creating',
    user.email
  ).run();

  /*
    Payload intentionally kept very close to Mercado Pago's documented
    Checkout Pro Orders API example for the first production test.
  */
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
        success_url:`${APP_BASE}/pago-resultado.html?estado=aprobado&order=${encodeURIComponent(localOrderId)}`,
        failure_url:`${APP_BASE}/pago-resultado.html?estado=fallido&order=${encodeURIComponent(localOrderId)}`,
        pending_url:`${APP_BASE}/pago-resultado.html?estado=pendiente&order=${encodeURIComponent(localOrderId)}`,
        auto_return:'approved'
      }
    },
    items:[{
      title:app.name,
      unit_price:amountString,
      quantity:1,
      unit_measure:'unit',
      total_amount:amountString
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

    const result=await mp.json().catch(()=>({}));

    if(!mp.ok||!result.id||!result.checkout_url){
      const diagnostic=safeMpError(result,mp.status);

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
        diagnostic_code:result?.code||result?.error||'order_error'
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

    console.error('MP_ORDER_CREATE_EXCEPTION',diagnostic);

    return json({
      error:'No fue posible conectar con Mercado Pago.'
    },502);
  }
}
