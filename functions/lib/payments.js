import{uuid}from'./auth.js';

function safeOrderPayload(order){
  return JSON.stringify({
    order_id:order?.id,
    status:order?.status,
    status_detail:order?.status_detail,
    external_reference:order?.external_reference,
    total_amount:order?.total_amount,
    total_paid_amount:order?.total_paid_amount,
    currency:order?.currency,
    last_updated_date:order?.last_updated_date,
    payments:(order?.transactions?.payments||[]).map(p=>({
      id:p?.id,
      status:p?.status,
      status_detail:p?.status_detail,
      amount:p?.amount,
      paid_amount:p?.paid_amount,
      payment_method:{
        id:p?.payment_method?.id,
        type:p?.payment_method?.type,
        installments:p?.payment_method?.installments
      }
    }))
  });
}

export async function reconcileMercadoPagoOrder(env,local){
  if(!env?.DB||!env?.MP_ACCESS_TOKEN||!local?.provider_payment_id){
    return{approved:false,deferred:true,reason:'not_configured'};
  }

  let order;
  try{
    const mp=await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(local.provider_payment_id)}`,
      {headers:{
        'Accept':'application/json',
        'Authorization':`Bearer ${env.MP_ACCESS_TOKEN}`
      }}
    );

    if(!mp.ok){
      console.error('MP_RECONCILE_FETCH_ERROR',{
        order_id:String(local.provider_payment_id),
        status:mp.status
      });
      return{approved:false,deferred:true,http_status:mp.status};
    }

    order=await mp.json();
  }catch(err){
    console.error('MP_RECONCILE_EXCEPTION',err?.message||String(err));
    return{approved:false,deferred:true,reason:'fetch_exception'};
  }

  const extRef=String(order?.external_reference||'');
  const orderStatus=String(order?.status||'unknown');
  const statusDetail=String(order?.status_detail||'');
  const currency=String(order?.currency||'');
  const totalAmount=Number(order?.total_amount||0);
  const totalPaid=Number(order?.total_paid_amount||0);

  const referenceOk=extRef===String(local.id);
  const currencyOk=currency===String(local.currency);
  const amountOk=Math.abs(totalAmount-Number(local.amount))<0.001;
  const paidOk=totalPaid+0.001>=Number(local.amount);

  const storedStatus=statusDetail
    ? `${orderStatus}:${statusDetail}`
    : orderStatus;

  await env.DB.prepare(
    `UPDATE payments
     SET status=?,raw_payload=?,updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).bind(storedStatus,safeOrderPayload(order),local.id).run();

  const approved=
    orderStatus==='processed' &&
    statusDetail==='accredited' &&
    referenceOk &&
    currencyOk &&
    amountOk &&
    paidOk;

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
      uuid(),
      local.user_id,
      local.app_slug,
      'mercadopago-orders',
      String(order.id)
    ).run();

    await env.DB.prepare(
      `UPDATE payments
       SET status='approved',updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind(local.id).run();

    return{
      approved:true,
      order_id:String(order.id),
      app_slug:local.app_slug
    };
  }

  if(orderStatus==='processed'){
    console.error('MP_RECONCILE_VALIDATION_MISMATCH',{
      order_id:String(order?.id||local.provider_payment_id),
      referenceOk,currencyOk,amountOk,paidOk,
      status:orderStatus,status_detail:statusDetail
    });
  }

  return{
    approved:false,
    status:orderStatus,
    status_detail:statusDetail
  };
}

export async function reconcileRecentPaymentsForUser(env,userId){
  if(!env?.DB||!env?.MP_ACCESS_TOKEN||!userId)return[];

  const rows=await env.DB.prepare(
    `SELECT id,user_id,app_slug,amount,currency,status,provider_payment_id
     FROM payments
     WHERE user_id=?
       AND provider='mercadopago-orders'
       AND provider_payment_id IS NOT NULL
       AND status IN ('created','processing','pending','processed:accredited')
       AND created_at>=datetime('now','-7 days')
     ORDER BY created_at DESC
     LIMIT 3`
  ).bind(userId).all();

  const results=[];
  for(const row of rows.results||[]){
    try{
      results.push(await reconcileMercadoPagoOrder(env,row));
    }catch(err){
      console.error('MP_RECOVERY_USER_PAYMENT_ERROR',err?.message||String(err));
    }
  }
  return results;
}
