import{json,currentUser,uuid}from'../../lib/auth.js';

const APP_BASE='https://plumkids-web.pages.dev';

export async function onRequestPost(context){
  const{request,env}=context;
  if(!env.DB)return json({error:'Base de datos no configurada.'},500);
  if(!env.MP_ACCESS_TOKEN)return json({error:'Mercado Pago no está configurado.'},503);

  const user=await currentUser(request,env);
  if(!user)return json({error:'Debes iniciar sesión antes de comprar.'},401);

  let body;
  try{body=await request.json()}catch{return json({error:'Solicitud inválida.'},400)}

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
  const amountString=amount.toFixed(2);

  await env.DB.prepare(
    `INSERT INTO payments
     (id,provider,user_id,app_slug,amount,currency,status,payer_email)
     VALUES(?,?,?,?,?,?,?,?)`
  ).bind(
    localOrderId,'mercadopago-orders',user.id,app.slug,
    amount,'COP','creating',user.email
  ).run();

  const orderPayload={
    type:'online',
    processing_mode:'manual',
    total_amount:amountString,
    external_reference:localOrderId,
    description:`${app.name} - Plumkids`,
    payer:{
      email:user.email,
      first_name:user.first_name,
      last_name:user.last_name
    },
    config:{
      statement_descriptor:'PLUMKIDS',
      online:{
        success_url:`${APP_BASE}/pago-resultado.html?estado=aprobado&order=${encodeURIComponent(localOrderId)}`,
        failure_url:`${APP_BASE}/pago-resultado.html?estado=fallido&order=${encodeURIComponent(localOrderId)}`,
        pending_url:`${APP_BASE}/pago-resultado.html?estado=pendiente&order=${encodeURIComponent(localOrderId)}`,
        auto_return:'approved'
      }
    },
    items:[{
      external_code:app.slug,
      title:app.name,
      description:'Aplicación educativa Plumkids. Pago único, sin suscripción.',
      quantity:1,
      unit_price:amountString
    }]
  };

  try{
    const mp=await fetch('https://api.mercadopago.com/v1/orders',{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type':'application/json',
        'X-Idempotency-Key':localOrderId
      },
      body:JSON.stringify(orderPayload)
    });

    const result=await mp.json().catch(()=>({}));

    if(!mp.ok||!result.id||!result.checkout_url){
      await env.DB.prepare(
        `UPDATE payments
         SET status='order_error',raw_payload=?,updated_at=CURRENT_TIMESTAMP
         WHERE id=?`
      ).bind(JSON.stringify({
        http_status:mp.status,
        error:result?.message||result?.error||'unknown'
      }),localOrderId).run();

      console.error('MP_ORDER_CREATE_ERROR',{
        status:mp.status,
        error:result?.message||result?.error||'unknown'
      });
      return json({error:'No fue posible iniciar el pago. Intenta nuevamente.'},502);
    }

    await env.DB.prepare(
      `UPDATE payments
       SET provider_payment_id=?,status=?,raw_payload=?,updated_at=CURRENT_TIMESTAMP
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
        currency:result.currency,
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
    await env.DB.prepare(
      `UPDATE payments
       SET status='order_exception',raw_payload=?,updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind(JSON.stringify({error:err?.message||String(err)}),localOrderId).run();

    console.error('MP_ORDER_CREATE_EXCEPTION',err?.message||String(err));
    return json({error:'No fue posible conectar con Mercado Pago.'},502);
  }
}
