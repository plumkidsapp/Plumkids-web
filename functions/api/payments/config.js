import{json}from'../../lib/auth.js';
export async function onRequestGet(context){
  return json({
    mercadopago:{
      orders_api:true,
      access_token_configured:Boolean(context.env.MP_ACCESS_TOKEN),
      webhook_secret_configured:Boolean(context.env.MP_WEBHOOK_SECRET)
    }
  });
}
