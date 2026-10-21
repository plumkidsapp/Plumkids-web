import{json,uuid}from'../../../lib/auth.js';
import{ensureLearningSchema,requireOwnedChild}from'../../../lib/learning.js';

const APP='mateaventura';
const ALLOWED=['MAT1-A1','MAT1-A2','MAT1-A3','MAT1-A4','MAT1-A5'];

export async function onRequestGet(context){
  const{request,env}=context;
  if(!env.DB)return json({error:'Base de datos no configurada.'},500);
  await ensureLearningSchema(env);

  const access=await requireOwnedChild(request,env,APP);
  if(access.response)return access.response;

  const row=await env.DB.prepare(
    `SELECT child_id,level,activity,stars,total_score,
            completed_activities,last_activity,updated_at
     FROM child_app_progress
     WHERE child_id=? AND user_id=? AND app_slug=?`
  ).bind(access.child.id,access.user.id,APP).first();

  const attempts=await env.DB.prepare(
    `SELECT activity_id,
            MAX(score) AS best_score,
            MAX(stars) AS best_stars,
            MAX(correct_answers) AS best_correct,
            total_questions,
            MAX(created_at) AS last_played
     FROM activity_attempts
     WHERE child_id=? AND user_id=? AND app_slug=? AND completed=1
     GROUP BY activity_id
     ORDER BY activity_id`
  ).bind(access.child.id,access.user.id,APP).all();

  return json({
    child:access.child,
    progress:row||{
      child_id:access.child.id,
      level:1,
      activity:1,
      stars:0,
      total_score:0,
      completed_activities:0,
      last_activity:null,
      updated_at:null
    },
    attempts:attempts.results||[]
  });
}

export async function onRequestPost(context){
  const{request,env}=context;
  if(!env.DB)return json({error:'Base de datos no configurada.'},500);
  await ensureLearningSchema(env);

  const access=await requireOwnedChild(request,env,APP);
  if(access.response)return access.response;

  let body;
  try{body=await request.json()}
  catch{return json({error:'Solicitud inválida.'},400)}

  const activityId=String(body.activityId||'').trim();
  const score=Math.max(0,Math.min(1000,Number(body.score)||0));
  const stars=Math.max(0,Math.min(3,Number(body.stars)||0));
  const correct=Math.max(0,Number(body.correctAnswers)||0);
  const total=Math.max(1,Number(body.totalQuestions)||1);
  const duration=Math.max(0,Number(body.durationSeconds)||0);

  if(!ALLOWED.includes(activityId))
    return json({error:'Actividad inválida.'},400);

  if(correct>total)
    return json({error:'Resultado inválido.'},400);

  await env.DB.prepare(
    `INSERT INTO activity_attempts
     (id,child_id,user_id,app_slug,activity_id,score,stars,
      correct_answers,total_questions,duration_seconds,completed)
     VALUES(?,?,?,?,?,?,?,?,?,?,1)`
  ).bind(
    uuid(),access.child.id,access.user.id,APP,activityId,
    score,stars,correct,total,duration
  ).run();

  const best=await env.DB.prepare(
    `SELECT activity_id,
            MAX(score) AS best_score,
            MAX(stars) AS best_stars
     FROM activity_attempts
     WHERE child_id=? AND user_id=? AND app_slug=? AND completed=1
     GROUP BY activity_id`
  ).bind(access.child.id,access.user.id,APP).all();

  const rows=best.results||[];
  const completed=rows.length;
  const totalStars=rows.reduce((sum,row)=>sum+(Number(row.best_stars)||0),0);
  const totalScore=rows.reduce((sum,row)=>sum+(Number(row.best_score)||0),0);
  const nextActivity=Math.min(5,completed+1);

  await env.DB.prepare(
    `INSERT INTO child_app_progress
     (id,child_id,user_id,app_slug,level,activity,stars,total_score,
      completed_activities,last_activity)
     VALUES(?,?,?,?,1,?,?,?,?,?)
     ON CONFLICT(child_id,app_slug) DO UPDATE SET
       activity=excluded.activity,
       stars=excluded.stars,
       total_score=excluded.total_score,
       completed_activities=excluded.completed_activities,
       last_activity=excluded.last_activity,
       updated_at=CURRENT_TIMESTAMP`
  ).bind(
    uuid(),access.child.id,access.user.id,APP,
    nextActivity,totalStars,totalScore,completed,activityId
  ).run();

  return json({
    ok:true,
    activityId,
    progress:{
      level:1,
      activity:nextActivity,
      stars:totalStars,
      total_score:totalScore,
      completed_activities:completed,
      all_completed:completed>=5
    }
  },201);
}
