import{json,currentUser}from'../../lib/auth.js';
import{reconcileMercadoPagoOrder}from'../../lib/payments.js';

export async function onRequestGet(context){
  const{request,env}=context;
  const user=await currentUser(request,env);
  if(!user)return json({error:'No autenticado.'},401);

  const localOrderId=new URL(request.url).searchParams.get('order')||'';
  if(!localOrderId)return json({error:'Orden requerida.'},400);

  let row=await env.DB.prepare(
    `SELECT p.id,p.provider,p.provider_payment_id,p.user_id,p.app_slug,
            p.amount,p.currency,p.status,p.created_at,p.updated_at,
            a.name AS app_name
     FROM payments p
     JOIN apps a ON a.slug=p.app_slug
     WHERE p.id=? AND p.user_id=?`
  ).bind(localOrderId,user.id).first();

  if(!row)return json({error:'Orden no encontrada.'},404);

  if(
    row.provider==='mercadopago-orders' &&
    row.provider_payment_id &&
    row.status!=='approved'
  ){
    try{
      await reconcileMercadoPagoOrder(env,row);
      row=await env.DB.prepare(
        `SELECT p.id,p.provider,p.provider_payment_id,p.user_id,p.app_slug,
                p.amount,p.currency,p.status,p.created_at,p.updated_at,
                a.name AS app_name
         FROM payments p
         JOIN apps a ON a.slug=p.app_slug
         WHERE p.id=? AND p.user_id=?`
      ).bind(localOrderId,user.id).first();
    }catch(err){
      console.error('PAYMENT_STATUS_RECOVERY_ERROR',err?.message||String(err));
    }
  }

  const entitlement=await env.DB.prepare(
    `SELECT id FROM entitlements
     WHERE user_id=? AND app_slug=? AND revoked_at IS NULL`
  ).bind(user.id,row.app_slug).first();

  return json({
    order:{
      id:row.id,
      provider_payment_id:row.provider_payment_id,
      app_slug:row.app_slug,
      app_name:row.app_name,
      amount:row.amount,
      currency:row.currency,
      status:row.status,
      created_at:row.created_at,
      updated_at:row.updated_at
    },
    access_enabled:Boolean(entitlement)
  });
}
