import{currentUser,refreshSessionIfNeeded}from'../lib/auth.js';

const protectedApps={
  '/play/lectoaventura':'lectoaventura',
  '/play/lectoaventura.html':'lectoaventura',
  '/play/mateaventura':'mateaventura',
  '/play/mateaventura.html':'mateaventura',
  '/play/memoria-magica':'memoria-magica',
  '/play/memoria-magica.html':'memoria-magica',
  '/play/emociones-en-juego':'emociones-en-juego',
  '/play/emociones-en-juego.html':'emociones-en-juego',
  '/play/crucigramas':'crucigramas',
  '/play/crucigramas.html':'crucigramas',
  '/play/hojas-vocabulario':'hojas-vocabulario',
  '/play/hojas-vocabulario.html':'hojas-vocabulario',
  '/play/laberintos':'laberintos',
  '/play/laberintos.html':'laberintos',
  '/play/matematicas-emojis':'matematicas-emojis',
  '/play/matematicas-emojis.html':'matematicas-emojis',
  '/play/matematicas':'matematicas',
  '/play/matematicas.html':'matematicas',
  '/play/quiz-reloj':'quiz-reloj',
  '/play/quiz-reloj.html':'quiz-reloj',
  '/play/secuencias':'secuencias',
  '/play/secuencias.html':'secuencias',
  '/play/sopa-letras':'sopa-letras',
  '/play/sopa-letras.html':'sopa-letras',
  '/play/trazado-formas':'trazado-formas',
  '/play/trazado-formas.html':'trazado-formas',
  '/play/trazos-lineas':'trazos-lineas',
  '/play/trazos-lineas.html':'trazos-lineas'
};

export async function onRequest(context){
  const{request,env}=context;
  const url=new URL(request.url);
  const slug=protectedApps[url.pathname];

  if(!slug)return context.next();

  if(!env.DB){
    return new Response('Base de datos no configurada.',{status:500});
  }

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
  ).bind(user.id,slug).first();

  if(!entitlement){
    return Response.redirect(
      `${url.origin}/mi-plumkids.html?access=required&app=${encodeURIComponent(slug)}`,
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
    console.error('PLAY_SESSION_REFRESH_ERROR',err?.message||String(err));
  }

  return response;
}
