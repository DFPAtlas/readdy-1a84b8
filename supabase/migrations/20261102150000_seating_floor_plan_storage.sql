-- Seating floor-plan backgrounds are stored in the private bucket under
-- seating/<wedding_id>/<plan_id>/<file>. Recognising the "seating" folder lets the
-- existing private-bucket policies apply the same per-wedding role checks used for
-- gallery and supplier files, and the subscription policy/trigger require the paid
-- "seating" feature (as for every other seating table). The app previously uploaded
-- to a "wedding-assets" bucket that was never created, so no existing files move.
create or replace function public.storage_wedding_id(path text) returns uuid language plpgsql immutable set search_path='' as $$
declare parts text[]:=string_to_array(path,'/'); begin
 if parts[1] not in ('galleries','suppliers','seating') or parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if; return parts[2]::uuid;
end $$;

create or replace function vowora_private.storage_feature(path text) returns text language sql immutable set search_path='' as $$
 select case split_part(path,'/',1) when 'galleries' then 'gallery' when 'suppliers' then 'suppliers' when 'seating' then 'seating' end;
$$;
