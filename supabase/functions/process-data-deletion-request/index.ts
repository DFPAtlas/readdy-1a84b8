import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { edgeGuestCorsHeaders } from '../_shared/guestAccess.ts';
Deno.serve(async req=>{
 const headers={...edgeGuestCorsHeaders(req),'Content-Type':'application/json'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return reply({});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:{user},error}=await db.auth.getUser((req.headers.get('authorization')||'').replace(/^Bearer /,''));
  if(error||!user)return reply({error:'Authentication required'},401);
  const {action,request_id}=await req.json();
  const {data:request}=await db.from('privacy_requests').select('id,user_id,request_type,status').eq('id',request_id).eq('user_id',user.id).maybeSingle();
  if(!request)return reply({error:'Request unavailable'},404);
  if(action!=='cancel_deletion')return reply({error:'Deletion requests are reviewed and fulfilled by Vowora support after the cooling-off period. Automatic deletion is not enabled.'},409);
  if(!['account_deletion','wedding_deletion'].includes(request.request_type)||!['submitted','pending','confirmed'].includes(request.status))return reply({error:'This request cannot be cancelled'},409);
  await db.from('privacy_requests').update({status:'cancelled'}).eq('id',request.id).eq('user_id',user.id).in('status',['submitted','pending','confirmed']).throwOnError();
  return reply({success:true});
 }catch{return reply({error:'Your request could not be updated. Please retry.'},500);}
});
