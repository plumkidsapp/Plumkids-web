import{json,currentUser}from'../../lib/auth.js';
import{ensureLearningSchema}from'../../lib/learning.js';

export async function onRequestGet(context){
  const{request,env}=context;
  if(!env.DB)return json({error:'Base de datos no configurada.'},500);
  const user=await currentUser(request,env);
  if(!user)return json({error:'No autenticado.'},401);

  await ensureLearningSchema(env);

  const rows=await env.DB.prepare(`
    SELECT
      p.child_id,c.name AS child_name,p.app_slug,a.name AS app_name,
      p.level,p.activity,p.stars,p.total_score,p.completed_activities,p.updated_at
    FROM child_app_progress p
    JOIN children c ON c.id=p.child_id
    JOIN apps a ON a.slug=p.app_slug
    WHERE p.user_id=?
    ORDER BY p.updated_at DESC
  `).bind(user.id).all();

  return json({progress:rows.results||[]});
}
