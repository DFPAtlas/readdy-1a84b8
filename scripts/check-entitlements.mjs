import assert from 'node:assert/strict';
export async function checkEntitlements(db, owner, wedding, otherWedding) {
 const asOwner = async () => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]); };
 const asServer = async () => { await db.exec("reset role; select set_config('request.jwt.claim.role','',false)"); };
 const setPlan = async (plan,status='active',future=true) => { await asServer(); await db.query("update public.wedora_subscriptions set plan_key=$2,status=$3,trial_end=now()+($4::int*interval '1 day'),current_period_end=now()+($4::int*interval '1 day'),ended_at=null,cancel_at_period_end=false where wedding_id=$1",[wedding,plan,status,future?1:-1]); await asOwner(); };
 const snapshot = async () => (await db.query('select public.get_wedding_entitlements($1) as e',[wedding])).rows[0].e;
 for (const [plan,guests,collaborators] of [['free',20,1],['essential',80,3],['complete',200,10],['luxury',null,null]]) {
  await setPlan(plan);
  const e=await snapshot(); assert.equal(e.planKey,plan); assert.equal(e.limits.maxGuests,guests); assert.equal(e.limits.maxCollaborators,collaborators);
  assert.equal(e.features.invitations,plan!=='free'); assert.equal(e.features.seating,['complete','luxury'].includes(plan)); assert.equal(e.features.weddingDay,plan==='luxury');
 }
 for (const status of ['past_due','unpaid','paused','canceled','cancelled','incomplete','incomplete_expired']) { await setPlan('luxury',status); assert.equal((await snapshot()).planKey,'free',status+' denies paid access'); }
 await setPlan('complete','trialing'); assert.equal((await snapshot()).planKey,'complete','Valid trial');
 await setPlan('complete','trialing',false); assert.equal((await snapshot()).planKey,'free','Expired trial fails closed without webhook');
 await setPlan('complete','active',false); assert.equal((await snapshot()).planKey,'free','Expired paid period');
 await setPlan('complete'); await asServer(); await db.query('update public.wedora_subscriptions set cancel_at_period_end=true where wedding_id=$1',[wedding]); await asOwner(); assert.equal((await snapshot()).planKey,'complete','Already-paid scheduled cancellation retains access');
 await asServer(); await db.query('update public.wedora_subscriptions set ended_at=now() where wedding_id=$1',[wedding]); await asOwner(); assert.equal((await snapshot()).planKey,'free','Ended subscription immediately fails closed');
 await assert.rejects(db.query('select public.get_wedding_entitlements($1)',[otherWedding]),/Wedding access required/,'Cannot inspect another wedding');
 await assert.rejects(db.query("select public.require_wedding_feature($1,'budget')",[wedding]),/permission denied/,'Browser cannot call service API');
 await assert.rejects(db.query('select vowora_private.effective_plan($1)',[wedding]),/permission denied/,'Private subscription lookup cannot be called by customer');
 await assert.rejects(db.query("insert into public.wedora_subscriptions(wedding_id,user_id,plan_key,status) values($1,$2,'luxury','active')",[otherWedding,owner]),/row-level security/,'Customer cannot forge paid state');
 await setPlan('free');
 await assert.rejects(db.query("insert into public.invitations(wedding_id,internal_name) values($1,'Unpaid invite')",[wedding]),/Upgrade|row-level security/);
 await assert.rejects(db.query("insert into public.wedding_budgets(wedding_id) values($1)",[wedding]),/Upgrade|row-level security/);
 await assert.rejects(db.query("insert into public.wedding_tasks(wedding_id,title) values($1,'Unpaid task')",[wedding]),/Upgrade|row-level security/);
 // Free users retain the existing basic guest list and RSVP data.
 assert.equal((await db.query('select count(*)::int as n from public.guests where wedding_id=$1',[wedding])).rows[0].n,1);
 await db.query("insert into public.guests(wedding_id,full_name) select $1,'Limit guest '||g from generate_series(1,19) g",[wedding]);
 await assert.rejects(db.query("insert into public.guests(wedding_id,full_name) values($1,'Guest 21')",[wedding]),/Subscription limit reached/,'Exact Free boundary');
 await db.query("update public.guests set full_name='Edited at cap' where wedding_id=$1",[wedding]);
 await asServer(); await db.exec("set role service_role; select set_config('request.jwt.claim.role','service_role',false)");
 await assert.rejects(db.query("insert into public.guests(wedding_id,full_name) values($1,'Backend plus-one')",[wedding]),/Subscription limit reached/,'Service writes also respect guest cap');
 await assert.rejects(db.query("select public.require_wedding_feature($1,'invitations')",[wedding]),/Upgrade/,'Privileged send is denied');
 await setPlan('essential');
 await asServer();
 const third='10000000-0000-4000-8000-000000000004',fourth='10000000-0000-4000-8000-000000000005';
 await db.query("insert into auth.users(id,email) values($1,'seat-three@test.invalid'),($2,'seat-four@test.invalid')",[third,fourth]);
 await db.query("insert into public.wedding_member_invitations(wedding_id,invited_email,email,role,status,expires_at,token_hash) values($1,'seat-three@test.invalid','seat-three@test.invalid','collaborator','pending',now()+interval '1 day',$2)",[wedding,'c'.repeat(64)]);
 await assert.rejects(db.query("insert into public.wedding_member_invitations(wedding_id,invited_email,email,role,status,expires_at) values($1,'seat-four@test.invalid','seat-four@test.invalid','viewer','pending',now()+interval '1 day')",[wedding]),/Collaborator limit reached/,'Pending invites reserve quota');
 await db.exec("set role service_role; select set_config('request.jwt.claim.role','service_role',false)");
 await db.query('select public.accept_wedding_member_invitation($1,$2)',['c'.repeat(64),third]);
 await asOwner(); assert.equal((await snapshot()).usage.maxCollaborators,3,'Accepting transfers the reserved seat');
 await assert.rejects(db.query("insert into public.wedding_members(wedding_id,user_id,role,status) values($1,$2,'viewer','active')",[wedding,fourth]),/Collaborator limit reached/,'Direct membership API cannot bypass allowance');
 await assert.rejects(db.query("update public.wedding_members set role='planner' where wedding_id=$1 and user_id=$2",[wedding,third]),/Planner access requires Luxury/);
 await asServer(); await db.query("insert into public.subscription_records(wedding_id,user_id,plan,status,stripe_subscription_id,current_period_end) values($1,$2,'luxury','active','sub_stale_legacy',now()+interval '1 day')",[wedding,owner]);
 await setPlan('free'); assert.equal((await snapshot()).planKey,'free','Canonical downgrade beats stale legacy paid state');
 await setPlan('essential');
 await setPlan('essential');
 await assert.rejects(db.query("insert into public.seating_plans(wedding_id,name) values($1,'Essential seating')",[wedding]),/Upgrade|row-level security/);
 await db.query("insert into public.invitations(wedding_id,internal_name) select $1,'Invitation '||g from generate_series(1,79) g",[wedding]); // one existing designer invitation
 await assert.rejects(db.query("insert into public.invitations(wedding_id,internal_name) values($1,'Invite 81')",[wedding]),/Subscription limit reached/);
 await db.query("insert into public.gallery_albums(wedding_id,title) select $1,'Album '||g from generate_series(1,5) g",[wedding]);
 await assert.rejects(db.query("insert into public.gallery_albums(wedding_id,title) values($1,'Album 6')",[wedding]),/Subscription limit reached/);
 await db.query("insert into public.email_campaigns(wedding_id,name) select $1,'Campaign '||g from generate_series(1,5) g",[wedding]);
 await assert.rejects(db.query("insert into public.email_campaigns(wedding_id,name) values($1,'Campaign 6')",[wedding]),/Subscription limit reached/);
 await assert.rejects(db.query("update public.wedding_website_configs set sections_config=$2::jsonb where wedding_id=$1",[wedding,JSON.stringify(Array.from({length:4},()=>({type:'custom_text'})))]),/Custom section limit reached/);
 await asServer();
 // Storage enforces actual bytes, not editable asset file_size.
 await db.query("insert into storage.objects(bucket_id,name,metadata) values('private',$1,'{\"size\":524288000}')",[`galleries/${wedding}/at-limit.jpg`]);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('private',$1,'{\"size\":1}')",[`galleries/${wedding}/over-limit.jpg`]),/Gallery storage limit reached/);
 await asOwner(); const usage=await snapshot(); assert.equal(usage.usage.maxGuests,20); assert.equal(usage.usage.maxAlbums,5); assert.equal(usage.usage.maxInvitations,80); assert.equal(usage.usage.galleryStorageMb,500);
 await asServer();
 await db.query("update public.wedding_website_configs set status='published',published_config=$2::jsonb where wedding_id=$1",[wedding,JSON.stringify({theme_config:{primary_color:'#paid-theme'},sections_config:[{type:'travel'},{type:'gallery'},{type:'custom_text'},{type:'custom_text'}]})]);
 await setPlan('free'); await db.exec('reset role; set role anon');
 const freePublic=(await db.query("select public.public_wedding_page('private-wedding') as p")).rows[0].p;
 assert.deepEqual(freePublic.config.sections_config.map(s=>s.type),['custom_text'],'Public output drops paid sections and excess custom sections');
 assert.equal(freePublic.config.theme_config.preset,'classic','Free gets the basic design');
 assert.equal(freePublic.features.whiteLabel,false,'Free branding cannot be removed');
 await setPlan('complete');
 const support=(await db.query("select public.submit_customer_support_request($1,'other','Fixture support','This is a local test request.') as ref",[wedding])).rows[0].ref;
 await asServer(); assert.equal((await db.query('select priority from public.wedora_support_cases where case_ref=$1',[support])).rows[0].priority,'high','Complete earns Priority support');
 await asOwner();
 await setPlan('free'); assert.equal((await db.query('select count(*)::int as n from public.invitations where wedding_id=$1',[wedding])).rows[0].n,0,'Downgrade hides paid data without deleting it');
 await setPlan('complete'); await db.query("insert into public.wedding_tasks(wedding_id,title) values($1,'Paid task')",[wedding]);
 await setPlan('luxury'); assert.equal((await db.query('select count(*)::int as n from public.invitations where wedding_id=$1',[wedding])).rows[0].n,80,'Upgrade restores saved data');
 await db.query("insert into public.invitations(wedding_id,internal_name) values($1,'Luxury invite 81')",[wedding]);
 // Seating floor plans: private bucket, scoped to the uploader's wedding, paid "seating" feature.
 await db.query("insert into storage.objects(bucket_id,name,metadata) values('private',$1,'{\"size\":2048}')",[`seating/${wedding}/plan-1/floor.png`]);
 // Give the other wedding a paid plan so only the membership rule can block this.
 await asServer(); await db.query("insert into public.wedora_subscriptions(wedding_id,user_id,plan_key,status,stripe_subscription_id,current_period_end) values($1,$2,'luxury','active','sub_other',now()+interval '1 month')",[otherWedding,owner]); await asOwner();
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('private',$1,'{\"size\":2048}')",[`seating/${otherWedding}/plan-1/floor.png`]),/row-level security/,'Cannot upload a floor plan into another wedding');
 await setPlan('essential');
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('private',$1,'{\"size\":2048}')",[`seating/${wedding}/plan-1/floor-2.png`]),/Upgrade|row-level security/,'Floor plans need a plan with seating');
 await setPlan('luxury');
 // Public "find your table" link on the wedding website.
 await asServer();
 const lookupFlag = async () => (await db.query("select public.public_wedding_page('private-wedding') as p")).rows[0].p.features.seatingLookup;
 assert.equal(await lookupFlag(), false, 'No table lookup link before a plan is published with lookup');
 const pubId = (await db.query("insert into public.seating_publications(wedding_id,status,lookup_settings,published_at) values($1,'published','{\"mode\":\"name_code\"}',now()) returning id",[wedding])).rows[0].id;
 assert.equal(await lookupFlag(), true, 'Table lookup link shows once a plan is published with name + code');
 await setPlan('essential'); await asServer();
 assert.equal(await lookupFlag(), false, 'Table lookup link is hidden without the seating feature');
 await setPlan('luxury'); await asServer();
 const lookupGuest = (await db.query("select id from public.guests where wedding_id=$1 limit 1",[wedding])).rows[0].id;
 await db.query("insert into public.seating_lookup_codes(wedding_id,publication_id,guest_id,code_hash,status) values($1,$2,$3,'hash-1','active')",[wedding,pubId,lookupGuest]);
 await assert.rejects(db.query("insert into public.seating_lookup_codes(wedding_id,publication_id,guest_id,code_hash,status) values($1,$2,$3,'hash-2','active')",[wedding,pubId,lookupGuest]),/duplicate key/,'One table code per guest per publication');
 // Website social images: public bucket, writable only by the wedding's couple/planner.
 await asOwner();
 await db.query("insert into storage.objects(bucket_id,name,metadata) values('website-public',$1,'{}')",[`website/${wedding}/social-1.jpg`]);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('website-public',$1,'{}')",[`website/${otherWedding}/social-1.jpg`]),/row-level security/,'Cannot put images on another wedding\'s website');
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('website-public',$1,'{}')",[`website/${wedding}/nested/social.jpg`]),/row-level security|Invalid website image path/,'Website images use a flat, validated path');
 for (let i=2;i<=20;i++) await db.query("insert into storage.objects(bucket_id,name,metadata) values('website-public',$1,'{}')",[`website/${wedding}/social-${i}.jpg`]);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('website-public',$1,'{}')",[`website/${wedding}/social-21.jpg`]),/image limit/,'Website image folder is capped');
 assert.equal((await db.query("select count(*)::int as n from storage.objects where bucket_id='website-public'")).rows[0].n,20,'Owner can list their own website images');
 // Shared photo upload link: database-generated token, owner-managed, gallery feature.
 const album = (await db.query("insert into public.gallery_albums(wedding_id,title) values($1,'Shared') returning id",[wedding])).rows[0].id;
 const created = (await db.query("insert into public.gallery_shared_upload_links(wedding_id,token,album_id,enabled) values($1,'chosen-by-client',$2,true) returning token",[wedding,album])).rows[0].token;
 assert.match(created,/^[0-9a-f]{32}$/,'Upload link token is generated by the database, not the client');
 await db.query("update public.gallery_shared_upload_links set token='attacker-token', enabled=false where wedding_id=$1",[wedding]);
 const afterUpdate = (await db.query('select token,enabled from public.gallery_shared_upload_links where wedding_id=$1',[wedding])).rows[0];
 assert.equal(afterUpdate.token,created,'A normal update cannot change the token'); assert.equal(afterUpdate.enabled,false);
 const rotated = (await db.query('select public.rotate_gallery_shared_upload_link($1) as t',[wedding])).rows[0].t;
 assert.notEqual(rotated,created,'Replacing the link issues a new token');
 assert.equal((await db.query('select token from public.gallery_shared_upload_links where wedding_id=$1',[wedding])).rows[0].token,rotated);
 await asServer(); const otherAlbum = (await db.query("insert into public.gallery_albums(wedding_id,title) values($1,'Theirs') returning id",[otherWedding])).rows[0].id; await asOwner();
 await assert.rejects(db.query('update public.gallery_shared_upload_links set album_id=$2 where wedding_id=$1',[wedding,otherAlbum]),/another wedding/,'Link cannot point at another wedding\'s album');
 await assert.rejects(db.query("insert into public.gallery_shared_upload_links(wedding_id,enabled) values($1,true)",[otherWedding]),/row-level security/,'Cannot create a link for another wedding');
 await assert.rejects(db.query("insert into public.gallery_shared_upload_activity(wedding_id,fingerprint,outcome) values($1,'x','uploaded')",[wedding]),/permission denied|row-level security/,'Upload activity is server-only');
 await setPlan('free'); await asOwner();
 assert.equal((await db.query('select count(*)::int as n from public.gallery_shared_upload_links where wedding_id=$1',[wedding])).rows[0].n,0,'Upload link needs the gallery feature');
 await setPlan('luxury');
 await db.exec('reset role; set role anon');
 const anonRows = await db.query('select token from public.gallery_shared_upload_links').then((r) => r.rows.length, (e) => (/permission denied/.test(e.message) ? 0 : Promise.reject(e)));
 assert.equal(anonRows,0,'Anonymous visitors cannot read upload links');
 await asServer(); console.log('Subscription tier, status, direct-API, quota and downgrade tests passed.');
}
