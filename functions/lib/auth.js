const encoder=new TextEncoder();
export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})}
export function uuid(){return crypto.randomUUID()}
export function bytesToHex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function hexToBytes(hex){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out}
export async function sha256(value){return bytesToHex(await crypto.subtle.digest('SHA-256',encoder.encode(value)))}
export async function hashPassword(password,saltHex=null){const salt=saltHex?hexToBytes(saltHex):crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:210000},key,256);return{hash:bytesToHex(bits),salt:bytesToHex(salt)}}
export async function verifyPassword(password,salt,expectedHash){const{hash}=await hashPassword(password,salt);if(hash.length!==expectedHash.length)return false;let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^expectedHash.charCodeAt(i);return diff===0}
export function getCookie(request,name){const cookie=request.headers.get('Cookie')||'';for(const part of cookie.split(';')){const[k,...v]=part.trim().split('=');if(k===name)return decodeURIComponent(v.join('='))}return null}
export async function createSession(env,userId){const id=uuid();const rawToken=`${id}.${bytesToHex(crypto.getRandomValues(new Uint8Array(32)))}`;const tokenHash=await sha256(rawToken);const expires=new Date(Date.now()+1000*60*60*24*30);await env.DB.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)').bind(id,userId,tokenHash,expires.toISOString()).run();return{rawToken,expires}}
export function sessionCookie(rawToken,expires){return `plum_session=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`}
export function clearSessionCookie(){return 'plum_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}
export async function currentUser(request,env){const raw=getCookie(request,'plum_session');if(!raw)return null;const tokenHash=await sha256(raw);const row=await env.DB.prepare(`SELECT u.id,u.first_name,u.last_name,u.email,s.id AS session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > ?`).bind(tokenHash,new Date().toISOString()).first();return row||null}
export function cleanEmail(v){return String(v||'').trim().toLowerCase()}
