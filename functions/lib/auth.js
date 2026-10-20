const encoder=new TextEncoder();

export const SESSION_TTL_MS=1000*60*60*24*180;
export const SESSION_RENEW_WINDOW_MS=1000*60*60*24*60;

export function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      ...headers
    }
  })
}

export function uuid(){return crypto.randomUUID()}
export function bytesToHex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function hexToBytes(hex){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out}
export async function sha256(value){return bytesToHex(await crypto.subtle.digest('SHA-256',encoder.encode(value)))}

export async function hashPassword(password,saltHex=null){
  const salt=saltHex?hexToBytes(saltHex):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits(
    {name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},
    key,
    256
  );
  return{hash:bytesToHex(bits),salt:bytesToHex(salt)}
}

export async function verifyPassword(password,salt,expectedHash){
  const{hash}=await hashPassword(password,salt);
  if(hash.length!==expectedHash.length)return false;
  let diff=0;
  for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^expectedHash.charCodeAt(i);
  return diff===0
}

export function getCookie(request,name){
  const cookie=request.headers.get('Cookie')||'';
  for(const part of cookie.split(';')){
    const[k,...v]=part.trim().split('=');
    if(k===name)return decodeURIComponent(v.join('='))
  }
  return null
}

export async function cleanupExpiredSessions(env){
  if(!env?.DB)return;
  try{
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?')
      .bind(new Date().toISOString()).run()
  }catch(err){
    console.error('SESSION_CLEANUP_ERROR',err?.message||String(err))
  }
}

export async function createSession(env,userId){
  await cleanupExpiredSessions(env);
  const id=uuid();
  const rawToken=`${id}.${bytesToHex(crypto.getRandomValues(new Uint8Array(32)))}`;
  const tokenHash=await sha256(rawToken);
  const expires=new Date(Date.now()+SESSION_TTL_MS);
  await env.DB.prepare(
    'INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)'
  ).bind(id,userId,tokenHash,expires.toISOString()).run();
  return{rawToken,expires}
}

export function sessionCookie(rawToken,expires){
  const maxAge=Math.max(0,Math.floor((expires.getTime()-Date.now())/1000));
  return `plum_session=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires.toUTCString()}`
}

export function clearSessionCookie(){
  return 'plum_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export async function currentUser(request,env){
  const raw=getCookie(request,'plum_session');
  if(!raw||!env?.DB)return null;
  const tokenHash=await sha256(raw);
  const row=await env.DB.prepare(`
    SELECT
      u.id,u.first_name,u.last_name,u.email,
      s.id AS session_id,s.expires_at
    FROM sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at > ?
  `).bind(tokenHash,new Date().toISOString()).first();
  if(!row)return null;
  return{...row,_raw_token:raw}
}

export async function refreshSessionIfNeeded(env,user){
  if(!user?.session_id||!user?._raw_token)return null;
  const expiry=Date.parse(user.expires_at);
  if(Number.isFinite(expiry) && expiry-Date.now()>SESSION_RENEW_WINDOW_MS)return null;

  const expires=new Date(Date.now()+SESSION_TTL_MS);
  await env.DB.prepare(
    'UPDATE sessions SET expires_at=? WHERE id=? AND user_id=?'
  ).bind(expires.toISOString(),user.session_id,user.id).run();

  return{expires,cookie:sessionCookie(user._raw_token,expires)}
}

export function cleanEmail(v){return String(v||'').trim().toLowerCase()}
