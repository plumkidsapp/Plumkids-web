import{json,currentUser}from'../../lib/auth.js';

export async function onRequestGet(context){
  const{request,env}=context;
  const user=await currentUser(request,env);
  if(!user)return json({error:'No autenticado.'},401);

  const localOrderId=new URL(request.url).searchParams.get('order')||'';
  if(!localOrderId)return json({error:'Orden requerida.'},400);

  const row=await env.DB.prepare(
    `SELECT p.id,p.provider_payment_id,p.app_slug,p.amount,p.currency,
            p.status,p.created_at,p.updated_at,a.name AS app_name
     FROM payments p
     JOIN apps a ON a.slug=p.app_slug
     WHERE p.id=? AND p.user_id=?`
  ).bind(localOrderId,user.id).first();

  if(!row)return json({error:'Orden no encontrada.'},404);

  const entitlement=await env.DB.prepare(
    `SELECT id FROM entitlements
     WHERE user_id=? AND app_slug=? AND revoked_at IS NULL`
  ).bind(user.id,row.app_slug).first();

  return json({order:row,access_enabled:Boolean(entitlement)});
}
