import{currentUser,refreshSessionIfNeeded}from'../lib/auth.js';

const APP='plumkids-builder';

export async function onRequest(context){
  const{request,env}=context;
  const url=new URL(request.url);

  if(!env.DB)
    return new Response('Base de datos no configurada.',{status:500});

  const user=await currentUser(request,env);
  if(!user){
    const next=url.pathname+url.search;
    return Response.redirect(
      `${url.origin}/login.html?next=${encodeURIComponent(next)}`,
      302
    );
  }

  const entitlement=await env.DB.prepare(
    `SELECT id FROM entitlements
     WHERE user_id=? AND app_slug=? AND revoked_at IS NULL`
  ).bind(user.id,APP).first();

  if(!entitlement){
    return Response.redirect(
      `${url.origin}/mi-plumkids.html?access=required&app=${encodeURIComponent(APP)}`,
      302
    );
  }

  const response=await context.next();

  try{
    const renewed=await refreshSessionIfNeeded(env,user);
    if(renewed){
      const copy=new Response(response.body,response);
      copy.headers.set('Set-Cookie',renewed.cookie);
      return copy;
    }
  }catch(err){
    console.error('BUILDER_SESSION_REFRESH_ERROR',err?.message||String(err));
  }

  return response;
}
