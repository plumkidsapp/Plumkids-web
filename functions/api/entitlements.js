import{json,currentUser}from'../lib/auth.js';
import{reconcileRecentPaymentsForUser}from'../lib/payments.js';

export async function onRequestGet(context){
  const{request,env}=context;
  const user=await currentUser(request,env);
  if(!user)return json({error:'No autenticado.'},401);

  try{
    await reconcileRecentPaymentsForUser(env,user.id);
  }catch(err){
    console.error('ENTITLEMENTS_PAYMENT_RECOVERY_ERROR',err?.message||String(err));
  }

  const rows=await env.DB.prepare(
    `SELECT e.app_slug,a.name,e.granted_at
     FROM entitlements e
     JOIN apps a ON a.slug=e.app_slug
     WHERE e.user_id=? AND e.revoked_at IS NULL
     ORDER BY e.granted_at DESC`
  ).bind(user.id).all();

  return json({entitlements:rows.results||[]});
}
