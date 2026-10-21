import{json,bytesToHex}from'../../lib/auth.js';
import{reconcileMercadoPagoOrder}from'../../lib/payments.js';

const encoder=new TextEncoder();
const MAX_SIGNATURE_AGE_MS=5*60*1000;

async function hmacHex(secret,message){
  const key=await crypto.subtle.importKey(
    'raw',encoder.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']
  );
  return bytesToHex(await crypto.subtle.sign(
    'HMAC',key,encoder.encode(message)
  ));
}

function safeEqualHex(a,b){
  a=String(a||'').toLowerCase();
  b=String(b||'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(a)||!/^[a-f0-9]{64}$/.test(b))return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

async function validateSignature(request,secret,dataId){
  const xSignature=request.headers.get('x-signature')||'';
  const requestId=request.headers.get('x-request-id')||'';
  if(!xSignature||!requestId||!dataId)return false;

  let ts='',v1='';
  for(const part of xSignature.split(',')){
    const[key,...rest]=part.trim().split('=');
    const value=rest.join('=').trim();
    if(key==='ts')ts=value;
    if(key==='v1')v1=value;
  }
  if(!ts||!v1)return false;

  const tsNumber=Number(ts);
  if(!Number.isFinite(tsNumber))return false;
  const tsMs=tsNumber>1e12?tsNumber:tsNumber*1000;
  if(Math.abs(Date.now()-tsMs)>MAX_SIGNATURE_AGE_MS)return false;

  const manifest=`id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected=await hmacHex(secret,manifest);
  return safeEqualHex(expected,v1);
}

export async function onRequestPost(context){
  const{request,env}=context;

  if(!env.DB||!env.MP_ACCESS_TOKEN||!env.MP_WEBHOOK_SECRET)
    return json({error:'Integración no configurada.'},503);

  const url=new URL(request.url);
  let payload={};
  try{payload=await request.json()}catch{}

  const eventType=url.searchParams.get('type')||String(payload?.type||'');
  const dataId=url.searchParams.get('data.id')||String(payload?.data?.id||'');

  if(eventType&&eventType!=='order')
    return json({ok:true,ignored:true});

  if(!dataId)return json({error:'Data ID requerido.'},400);

  if(!(await validateSignature(request,env.MP_WEBHOOK_SECRET,dataId))){
    console.warn('MP_WEBHOOK_INVALID_SIGNATURE',{type:eventType||'order'});
    return json({error:'Firma inválida.'},401);
  }

  const local=await env.DB.prepare(
    `SELECT id,user_id,app_slug,amount,currency,status,provider_payment_id
     FROM payments
     WHERE provider='mercadopago-orders'
       AND provider_payment_id=?`
  ).bind(dataId).first();

  if(!local)
    return json({ok:true,ignored:true,reason:'order_not_registered'});

  const result=await reconcileMercadoPagoOrder(env,local);

  return json({
    ok:true,
    approved:Boolean(result.approved),
    deferred:Boolean(result.deferred)
  });
}
