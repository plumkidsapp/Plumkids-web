import{json,currentUser}from'./auth.js';

export async function ensureLearningSchema(env){
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS child_app_progress (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      app_slug TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      activity INTEGER NOT NULL DEFAULT 1,
      stars INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      completed_activities INTEGER NOT NULL DEFAULT 0,
      last_activity TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(child_id, app_slug),
      FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(app_slug) REFERENCES apps(slug)
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS activity_attempts (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      app_slug TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      stars INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(app_slug) REFERENCES apps(slug)
    )
  `).run();

  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_progress_user_app ON child_app_progress(user_id,app_slug)'
  ).run();
  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_attempts_child_app ON activity_attempts(child_id,app_slug)'
  ).run();
}

export async function requireOwnedChild(request,env,appSlug){
  const user=await currentUser(request,env);
  if(!user)return{response:json({error:'No autenticado.'},401)};

  const entitlement=await env.DB.prepare(
    `SELECT id FROM entitlements
     WHERE user_id=? AND app_slug=? AND revoked_at IS NULL`
  ).bind(user.id,appSlug).first();

  if(!entitlement)return{response:json({error:'Aplicación no habilitada.'},403),user};

  const url=new URL(request.url);
  const childId=url.searchParams.get('child')||'';
  if(!childId)return{response:json({error:'Perfil infantil requerido.'},400),user};

  const child=await env.DB.prepare(
    'SELECT id,name,age FROM children WHERE id=? AND user_id=?'
  ).bind(childId,user.id).first();

  if(!child)return{response:json({error:'Perfil infantil no encontrado.'},404),user};

  return{user,child};
}
