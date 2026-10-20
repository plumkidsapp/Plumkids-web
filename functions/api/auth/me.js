import{json,currentUser,refreshSessionIfNeeded,cleanupExpiredSessions}from'../../lib/auth.js';

export async function onRequestGet(context){
  const{request,env}=context;
  await cleanupExpiredSessions(env);
  const u=await currentUser(request,env);
  if(!u)return json({error:'No autenticado.'},401);

  let headers={};
  try{
    const renewed=await refreshSessionIfNeeded(env,u);
    if(renewed)headers['Set-Cookie']=renewed.cookie;
  }catch(err){
    console.error('SESSION_REFRESH_ERROR',err?.message||String(err));
  }

  return json({
    user:{
      id:u.id,
      first_name:u.first_name,
      last_name:u.last_name,
      email:u.email
    }
  },200,headers)
}
