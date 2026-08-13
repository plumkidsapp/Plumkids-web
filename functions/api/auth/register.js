import{json,uuid,hashPassword,createSession,sessionCookie,cleanEmail}from'../../lib/auth.js';

export async function onRequestPost(context){
  const{request,env}=context;
  if(!env.DB)return json({error:'Base de datos no configurada.'},500);

  try{
    let b;
    try{b=await request.json()}catch{return json({error:'Solicitud inválida.'},400)}

    const firstName=String(b.firstName||'').trim();
    const lastName=String(b.lastName||'').trim();
    const email=cleanEmail(b.email);
    const password=String(b.password||'');
    const childName=b.childName?String(b.childName).trim():null;
    const childAge=b.childAge==null?null:Number(b.childAge);

    if(!firstName||!lastName||!email.includes('@'))
      return json({error:'Completa nombre, apellido y correo.'},400);

    if(password.length<8)
      return json({error:'La contraseña debe tener al menos 8 caracteres.'},400);

    if(childAge!=null&&(!Number.isInteger(childAge)||childAge<2||childAge>17))
      return json({error:'Edad del niño/a inválida.'},400);

    const exists=await env.DB.prepare(
      'SELECT id FROM users WHERE email=? COLLATE NOCASE'
    ).bind(email).first();

    if(exists)
      return json({error:'Ya existe una cuenta con ese correo.'},409);

    const userId=uuid();
    const hp=await hashPassword(password);

    await env.DB.prepare(
      'INSERT INTO users(id,first_name,last_name,email,password_hash,password_salt) VALUES(?,?,?,?,?,?)'
    ).bind(userId,firstName,lastName,email,hp.hash,hp.salt).run();

    if(childName&&childAge!=null){
      await env.DB.prepare(
        'INSERT INTO children(id,user_id,name,age) VALUES(?,?,?,?)'
      ).bind(uuid(),userId,childName,childAge).run();
    }

    const session=await createSession(env,userId);

    return json(
      {ok:true,user:{id:userId,first_name:firstName,last_name:lastName,email}},
      201,
      {'Set-Cookie':sessionCookie(session.rawToken,session.expires)}
    );
  }catch(err){
    console.error('REGISTER_ERROR',err?.name||'Error',err?.message||String(err));
    return json({error:'No fue posible crear la cuenta. Intenta nuevamente.'},500);
  }
}
