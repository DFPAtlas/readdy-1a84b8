import checkSchema from "./check-schema-contract.cjs";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
async function main() {
  const db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
alter default privileges in schema public grant execute on functions to anon, authenticated;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean default false); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text); alter table storage.objects enable row level security;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text) $$;`);
  const baseline = JSON.parse(
    await readFile(
      new URL("../docs/database-schema-audit.json", import.meta.url),
      "utf8",
    ),
  );
  for (const table of baseline) {
    assert.match(table.name, /^public\.[a-z_]+$/);
    const columns = table.columns.map((column) => {
      assert.match(column.name, /^[a-z_][a-z_0-9]*$/);
      return `${column.name} ${column.data_type}${column.name === "id" ? " primary key" : ""}${column.default_value ? ` default ${column.default_value}` : ""}`;
    });
    await db.exec(
      `create table ${table.name}(${columns.join(",")}); alter table ${table.name} enable row level security;`,
    );
  }
  const relationships = new Map();
  for (const table of baseline)
    for (const fk of table.foreign_key_constraints || [])
      relationships.set(fk.name, fk);
  for (const fk of relationships.values())
    await db.exec(
      `alter table ${fk.source_table} add constraint ${fk.name} foreign key(${fk.source_columns.join(",")}) references ${fk.target_table}(${fk.target_columns.join(",")});`,
    );
  for (const file of (
    await readdir(new URL("../supabase/migrations", import.meta.url))
  )
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(
      new URL(`../supabase/migrations/${file}`, import.meta.url),
      "utf8",
    );
    try {
      await db.exec(sql);
    } catch (error) {
      console.error(file + ": " + error.message);
      process.exit(1);
    }
    console.log(`Applied ${file}`);
  }
  checkSchema(
    (
      await db.query(
        "select table_name,column_name,data_type from information_schema.columns where table_schema='public'",
      )
    ).rows,
  );
  if (process.env.VOWORA_SCHEMA_OUTPUT)
    await writeFile(
      process.env.VOWORA_SCHEMA_OUTPUT,
      JSON.stringify(
        (
          await db.query(
            "select table_name,column_name,data_type from information_schema.columns where table_schema='public'",
          )
        ).rows,
      ),
    );
  await db.exec(
    "grant usage on schema public,auth to authenticated,anon,service_role; grant select,insert,update,delete on all tables in schema public to authenticated,anon,service_role;",
  );
  const owner = "10000000-0000-4000-8000-000000000001",
    viewer = "10000000-0000-4000-8000-000000000002",
    stranger = "10000000-0000-4000-8000-000000000003";
  const wedding = "20000000-0000-4000-8000-000000000001",
    otherWedding = "20000000-0000-4000-8000-000000000002";
  await db.query(
    "insert into auth.users(id,email) values($1,'owner@test.invalid'),($2,'viewer@test.invalid'),($3,'stranger@test.invalid')",
    [owner, viewer, stranger],
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.profiles")).rows[0]
      .n,
    3,
    "Signup creates profiles",
  );
  await db.query(
    "insert into public.weddings(id,title,slug,status) values($1,'Private wedding','private-wedding','planning'),($2,'Other wedding','other-wedding','planning')",
    [wedding, otherWedding],
  );
  await db.query(
    "insert into public.wedding_members(wedding_id,user_id,role,status) values($1,$2,'owner','active'),($1,$3,'viewer','active')",
    [wedding, owner, viewer],
  );
  await db.query(
    "insert into public.guests(wedding_id,full_name,email) values($1,'Private Guest','private@test.invalid')",
    [wedding],
  );
  await db.exec("set role anon");
  assert.equal(
    (await db.query("select count(*)::int as n from public.weddings")).rows[0]
      .n,
    0,
    "Anonymous users cannot read private weddings",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false); set role authenticated`,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    stranger,
  ]);
  assert.equal(
    (await db.query("select count(*)::int as n from public.weddings")).rows[0]
      .n,
    0,
    "Non-members cannot read weddings",
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    viewer,
  ]);
  assert.equal(
    (await db.query("select count(*)::int as n from public.guests")).rows[0].n,
    0,
    "Viewers cannot read private guest records",
  );
  const update = await db.query(
    "update public.wedding_members set role='owner' where user_id=$1 returning id",
    [viewer],
  );
  assert.equal(update.rows.length, 0, "Viewers cannot promote themselves");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  assert.equal(
    (await db.query("select count(*)::int as n from public.guests")).rows[0].n,
    1,
    "Owners can read their guest list",
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.weddings")).rows[0]
      .n,
    1,
    "Owners cannot read another wedding",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false)`,
  );
  await db.query(
    "insert into public.wedding_member_invitations(wedding_id,email,invited_email,role,status,token_hash,expires_at) values($1,'stranger@test.invalid','stranger@test.invalid','collaborator','pending',$2,now()+interval '1 day')",
    [wedding, "a".repeat(64)],
  );
  await db.exec(
    `set role service_role; select set_config('request.jwt.claim.role','service_role',false)`,
  );
  await assert.rejects(
    db.query("select public.accept_wedding_member_invitation($1,$2)", [
      "a".repeat(64),
      viewer,
    ]),
    /Invitation unavailable/,
  );
  assert.equal(
    (
      await db.query(
        "select public.accept_wedding_member_invitation($1,$2) as wedding",
        ["a".repeat(64), stranger],
      )
    ).rows[0].wedding,
    wedding,
    "The invited email can join",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false)`,
  );
  assert.equal(
    (
      await db.query(
        "select onboarding_completed from public.profiles where id=$1",
        [stranger],
      )
    ).rows[0].onboarding_completed,
    true,
  );
  // Real PostgreSQL checks for the end-to-end release boundaries.
  const design = "30000000-0000-4000-8000-000000000001";
  const guest = (
    await db.query("select id from public.guests where wedding_id=$1", [
      wedding,
    ])
  ).rows[0].id;
  await db.query(
    "insert into public.invitation_designs(id,wedding_id,user_id,title) values($1,$2,$3,'Test design')",
    [design, wedding, owner],
  );
  await db.exec(
    `set role service_role; select set_config('request.jwt.claim.role','service_role',false)`,
  );
  const sendArgs = [
    design,
    guest,
    "release-test-submission",
    "b".repeat(64),
    owner,
  ];
  const firstSend = (
    await db.query(
      "select public.prepare_design_invitation_send($1,$2,$3,$4,$5) as data",
      sendArgs,
    )
  ).rows[0].data;
  const retrySend = (
    await db.query(
      "select public.prepare_design_invitation_send($1,$2,$3,$4,$5) as data",
      sendArgs,
    )
  ).rows[0].data;
  assert.equal(
    firstSend.log_id,
    retrySend.log_id,
    "Email retries reuse the delivery record",
  );
  await db.query(
    "update public.send_log set resend_email_id='fixture-email' where id=$1",
    [firstSend.log_id],
  );
  await db.query(
    "select public.apply_email_delivery_event('fixture-event','fixture-email','email.delivered','delivered')",
  );
  await db.query(
    "select public.apply_email_delivery_event('fixture-event','fixture-email','email.delivered','delivered')",
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from public.email_delivery_events where event_id='fixture-event'",
      )
    ).rows[0].n,
    1,
    "Provider retries record a delivery event once",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false)`,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from public.invitation_recipients where guest_id=$1",
        [guest],
      )
    ).rows[0].n,
    1,
    "Designer sends use the RSVP recipient table",
  );
  const category = (
    await db.query(
      "insert into public.budget_categories(wedding_id,name) values($1,'Other private category') returning id",
      [otherWedding],
    )
  ).rows[0].id;
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await assert.rejects(
    db.query(
      "insert into public.budget_expenses(wedding_id,category_id,title) values($1,$2,'Cross-wedding expense')",
      [wedding, category],
    ),
    /Invalid wedding reference/,
  );
  await assert.rejects(
    db.query(
      "insert into public.gift_fund_contributions(wedding_id,payment_status) values($1,'paid')",
      [wedding],
    ),
    /row-level security/,
  );
  await assert.rejects(
    db.query(
      "insert into public.verified_senders(wedding_id,email,is_verified) values($1,'forged@test.invalid',true)",
      [wedding],
    ),
    /row-level security/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from public.operational_incidents",
      )
    ).rows[0].n,
    0,
    "Wedding owners do not gain staff access",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false)`,
  );
  await db.query(
    "insert into public.wedding_website_configs(wedding_id,status,published_config) values($1,'draft','{\"sections_config\":[]}')",
    [wedding],
  );
  await db.exec("set role anon");
  assert.equal(
    (
      await db.query(
        "select public.public_wedding_page('private-wedding') as page",
      )
    ).rows[0].page,
    null,
    "Draft website unavailable publicly",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false)`,
  );
  await db.query(
    "update public.wedding_website_configs set status='published' where wedding_id=$1",
    [wedding],
  );
  await db.exec("set role anon");
  const publicPage = (
    await db.query(
      "select public.public_wedding_page('private-wedding') as page",
    )
  ).rows[0].page;
  assert.equal(publicPage.wedding.title, "Private wedding");
  assert.equal(
    publicPage.guests,
    undefined,
    "Published page never returns the guest list",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false); set role authenticated`,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.query("select public.close_wedding_guest_experience($1)", [wedding]);
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false)`,
  );
  assert.equal(
    (
      await db.query(
        "select status from public.wedding_website_configs where wedding_id=$1",
        [wedding],
      )
    ).rows[0].status,
    "unpublished",
    "Aftercare unpublishes the website",
  );
  assert.equal(
    (
      await db.query(
        "select status from public.invitation_access_tokens where invitation_id=$1",
        [firstSend.invitation_id],
      )
    ).rows[0].status,
    "revoked",
    "Aftercare revokes invitation access",
  );
  await db.exec(
    `set role service_role; select set_config('request.jwt.claim.role','service_role',false)`,
  );
  const payload = {
    partner_one_first: "Alex",
    partner_two_first: "Sam",
    partner_one_last: "",
    display_name: "Alex & Sam",
    wedding_date: "",
    timezone: "Europe/London",
    location: "",
    ceremony_venue: "",
    reception_venue: "",
    guest_estimate: 50,
    priorities: [],
  };
  const created = (
    await db.query(
      "select public.provision_customer_workspace($1,$2,null,null) as data",
      [stranger, JSON.stringify(payload)],
    )
  ).rows[0].data;
  const retried = (
    await db.query(
      "select public.provision_customer_workspace($1,$2,null,null) as data",
      [stranger, JSON.stringify(payload)],
    )
  ).rows[0].data;
  assert.equal(
    created.wedding_id,
    retried.wedding_id,
    "Onboarding retry never creates a duplicate wedding",
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.role','',false)`,
  );
  assert.equal(
    (
      await db.query(
        "select portal_enabled from public.guest_portal_settings where wedding_id=$1",
        [created.wedding_id],
      )
    ).rows[0].portal_enabled,
    false,
    "New weddings start private",
  );
  await db.close();
  console.log("Database migration and access boundary checks passed.");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
