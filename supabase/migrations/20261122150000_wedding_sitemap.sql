-- ── Sitemap of couple websites that opted in to search indexing ──
-- Same rule the published page uses (PublishedWeddingWebsite): a site is
-- listed when it is published and its published SEO settings allow search
-- indexing. Sites that declare their own canonical domain are left out,
-- because their vowora.uk/w/<slug> address is not the canonical one.
-- Read only by the wedding-sitemap Edge Function (service role); the public
-- surface is the sitemap itself.
create or replace function public.indexable_wedding_sites(p_limit integer default 50000)
returns table(slug text, lastmod timestamptz)
language sql stable security definer set search_path = '' as $$
  select w.slug, coalesce(c.published_at, c.updated_at) as lastmod
  from public.weddings w
  join public.wedding_website_configs c on c.wedding_id = w.id
  where c.status = 'published'
    and c.published_config is not null
    and w.slug is not null
    and length(w.slug) between 1 and 160
    and coalesce((c.published_config -> 'seo_config' ->> 'search_indexing')::boolean, false)
    and coalesce(nullif(trim(c.published_config -> 'seo_config' ->> 'canonical_domain'), ''), '') = ''
  order by lastmod desc nulls last, w.slug
  limit greatest(1, least(coalesce(p_limit, 50000), 50000));
$$;

revoke all on function public.indexable_wedding_sites(integer) from public, anon, authenticated;
grant execute on function public.indexable_wedding_sites(integer) to service_role;
