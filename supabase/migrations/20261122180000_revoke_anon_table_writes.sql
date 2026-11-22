-- Defence in depth: the anonymous (signed-out) API role never writes tables directly.
--
-- Every public-table write policy targets `authenticated`, and guest flows (RSVP,
-- uploads, travel plans, gift-fund checkout) go through Edge Functions using the
-- service role. RLS already denies anon writes; removing the table privileges as
-- well means a future policy mistake cannot open a table to signed-out writes.
-- SELECT stays granted: RLS still decides what anon can read (public assets only).

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

-- Tables created by later migrations inherit the same rule.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
