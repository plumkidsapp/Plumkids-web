import{json,uuid,bytesToHex}from'../../lib/auth.js';

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

  if(eventType&&eventType!=='order')return json({ok:true,ignored:true});
  if(!dataId)return json({error:'Data ID requerido.'},400);

  if(!(await validateSignature(request,env.MP_WEBHOOK_SECRET,dataId))){
    console.warn('MP_WEBHOOK_INVALID_SIGNATURE',{type:eventType||'order'});
    return json({error:'Firma inválida.'},401);
  }

  const local=await env.DB.prepare(
    `SELECT id,user_id,app_slug,amount,currency,status
     FROM payments
     WHERE provider='mercadopago-orders' AND provider_payment_id=?`
  ).bind(dataId).first();

  // Useful for Mercado Pago's signed simulator and harmless unknown orders.
  if(!local)return json({ok:true,ignored:true,reason:'order_not_registered'});

  let order;
  try{
    const mp=await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`,
      {headers:{'Authorization':`Bearer ${env.MP_ACCESS_TOKEN}`}}
    );
    if(!mp.ok){
      console.error('MP_ORDER_FETCH_ERROR',{status:mp.status});
      return json({ok:true,deferred:true});
    }
    order=await mp.json();
  }catch(err){
    console.error('MP_ORDER_FETCH_EXCEPTION',err?.message||String(err));
    return json({ok:true,deferred:true});
  }

  const extRef=String(order.external_reference||'');
  const orderStatus=String(order.status||'unknown');
  const statusDetail=String(order.status_detail||'');
  const currency=String(order.currency||'');
  const totalAmount=Number(order.total_amount||0);
  const totalPaid=Number(order.total_paid_amount||0);

  const referenceOk=extRef===String(local.id);
  const currencyOk=currency===String(local.currency);
  const amountOk=Math.abs(totalAmount-Number(local.amount))<0.001;
  const paidOk=totalPaid+0.001>=Number(local.amount);

  const safePayload=JSON.stringify({
    order_id:order.id,
    status:order.status,
    status_detail:order.status_detail,
    external_reference:order.external_reference,
    total_amount:order.total_amount,
    total_paid_amount:order.total_paid_amount,
    currency:order.currency,
    last_updated_date:order.last_updated_date,
    payments:(order?.transactions?.payments||[]).map(p=>({
      id:p.id,status:p.status,status_detail:p.status_detail,
      amount:p.amount,paid_amount:p.paid_amount,
      payment_method:{
        id:p?.payment_method?.id,
        type:p?.payment_method?.type,
        installments:p?.payment_method?.installments
      }
    }))
  });

  await env.DB.prepare(
    `UPDATE payments
     SET status=?,raw_payload=?,updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).bind(
    statusDetail?`${orderStatus}:${statusDetail}`:orderStatus,
    safePayload,
    local.id
  ).run();

  const approved=
    orderStatus==='processed' &&
    statusDetail==='accredited' &&
    referenceOk && currencyOk && amountOk && paidOk;

  if(approved){
    await env.DB.prepare(
      `INSERT INTO entitlements
       (id,user_id,app_slug,source,source_reference,granted_at,revoked_at)
       VALUES(?,?,?,?,?,CURRENT_TIMESTAMP,NULL)
       ON CONFLICT(user_id,app_slug) DO UPDATE SET
         source=excluded.source,
         source_reference=excluded.source_reference,
         granted_at=CURRENT_TIMESTAMP,
         revoked_at=NULL`
    ).bind(
      uuid(),local.user_id,local.app_slug,
      'mercadopago-orders',String(order.id)
    ).run();

    await env.DB.prepare(
      `UPDATE payments SET status='approved',updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind(local.id).run();
  }

  if(orderStatus==='processed'&&!approved){
    console.error('MP_ORDER_VALIDATION_MISMATCH',{
      order_id:String(order.id),
      referenceOk,currencyOk,amountOk,paidOk,
      status:orderStatus,status_detail:statusDetail
    });
  }

  return json({ok:true,approved});
}
