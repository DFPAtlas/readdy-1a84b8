import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const BUCKET = 'invitation-assets';

// Each asset: [storagePath, searchImageUrl]
// The thumbnail path is derived by inserting '-thumb' before '.png'
const ASSETS: [string, string][] = [
  [
    'florals/blush-peony-cluster.png',
    'https://readdy.ai/api/search-image?query=Delicate%20blush%20pink%20peony%20flower%20cluster%20with%20soft%20petals%20and%20green%20leaves%2C%20isolated%20on%20transparent%20background%2C%20watercolor%20botanical%20illustration%20style%2C%20elegant%20wedding%20invitation%20decoration%2C%20soft%20romantic%20aesthetic%2C%20light%20airy%20composition%2C%20clean%20edges%2C%20commercial%20use%20quality%2C%20no%20text%20no%20watermark%20no%20frame%20no%20shadow&width=500&height=500&seq=wedora-floral-01&orientation=squarish',
  ],
  [
    'florals/rose-gold-bouquet.png',
    'https://readdy.ai/api/search-image?query=Elegant%20rose%20gold%20toned%20bouquet%20of%20roses%20and%20peonies%20with%20warm%20champagne%20hues%2C%20isolated%20on%20transparent%20background%2C%20watercolor%20botanical%20illustration%2C%20luxury%20wedding%20invitation%20floral%20decoration%2C%20soft%20romantic%20composition%2C%20delicate%20petals%2C%20clean%20edges%2C%20no%20text%20no%20watermark%20no%20frame%20no%20shadow&width=500&height=500&seq=wedora-floral-02&orientation=squarish',
  ],
  [
    'florals/white-lily-spray.png',
    'https://readdy.ai/api/search-image?query=Elegant%20white%20lily%20spray%20with%20long%20green%20stems%20and%20delicate%20blooms%2C%20isolated%20on%20transparent%20background%2C%20watercolor%20botanical%20illustration%2C%20wedding%20invitation%20floral%20element%2C%20clean%20minimal%20composition%2C%20airy%20light%20aesthetic%2C%20no%20text%20no%20watermark%20no%20frame%20no%20shadow&width=500&height=500&seq=wedora-floral-03&orientation=squarish',
  ],
  [
    'florals/wildflower-garland.png',
    'https://readdy.ai/api/search-image?query=Horizontal%20wildflower%20garland%20with%20daisies%20lavender%20and%20small%20blooms%20in%20soft%20pastel%20colors%2C%20isolated%20on%20transparent%20background%2C%20watercolor%20botanical%20illustration%2C%20wedding%20invitation%20border%20decoration%2C%20airy%20romantic%20style%2C%20no%20text%20no%20watermark%20no%20shadow&width=600&height=300&seq=wedora-floral-04&orientation=landscape',
  ],
  [
    'leaves/eucalyptus-branch.png',
    'https://readdy.ai/api/search-image?query=Eucalyptus%20branch%20with%20silvery%20green%20leaves%20hanging%20vertically%2C%20isolated%20on%20transparent%20background%2C%20watercolor%20botanical%20illustration%2C%20wedding%20invitation%20greenery%20element%2C%20delicate%20natural%20composition%2C%20soft%20sage%20tones%2C%20clean%20edges%2C%20no%20text%20no%20watermark%20no%20frame%20no%20shadow&width=400&height=500&seq=wedora-leaf-01&orientation=portrait',
  ],
  [
    'leaves/fern-frond.png',
    'https://readdy.ai/api/search-image?query=Delicate%20fern%20frond%20with%20intricate%20leaflets%20in%20soft%20forest%20green%2C%20isolated%20on%20transparent%20background%2C%20watercolor%20botanical%20illustration%2C%20wedding%20invitation%20greenery%20decoration%2C%20elegant%20natural%20style%2C%20clean%20edges%2C%20no%20text%20no%20watermark%20no%20frame%20no%20shadow&width=400&height=500&seq=wedora-leaf-02&orientation=portrait',
  ],
  [
    'leaves/olive-wreath.png',
    'https://readdy.ai/api/search-image?query=Circular%20olive%20branch%20wreath%20with%20silvery%20green%20leaves%20forming%20a%20ring%2C%20isolated%20on%20transparent%20background%2C%20watercolor%20botanical%20illustration%2C%20wedding%20invitation%20wreath%20frame%2C%20elegant%20Mediterranean%20style%2C%20clean%20circular%20composition%2C%20no%20text%20no%20watermark%20no%20shadow&width=500&height=500&seq=wedora-leaf-03&orientation=squarish',
  ],
  [
    'frames/gold-ornate-border.png',
    'https://readdy.ai/api/search-image?query=Ornate%20gold%20rectangular%20border%20frame%20with%20elegant%20filigree%20corners%20and%20delicate%20scrollwork%2C%20transparent%20center%20with%20decorative%20edges%20only%2C%20luxury%20wedding%20invitation%20frame%2C%20warm%20champagne%20gold%20tone%2C%20vintage%20elegant%20style%2C%20no%20text%20inside%2C%20no%20watermark%2C%20clean%20isolated%20on%20transparent&width=560&height=560&seq=wedora-frame-01&orientation=squarish',
  ],
  [
    'frames/minimal-rectangular.png',
    'https://readdy.ai/api/search-image?query=Simple%20minimal%20thin%20gold%20rectangular%20border%20with%20clean%20straight%20lines%20and%20tiny%20corner%20accents%2C%20transparent%20center%2C%20isolated%20on%20transparent%20background%2C%20modern%20minimalist%20wedding%20invitation%20frame%2C%20delicate%20hairline%20gold%2C%20no%20text%2C%20no%20watermark%2C%20no%20shadow&width=560&height=560&seq=wedora-frame-02&orientation=squarish',
  ],
  [
    'frames/vintage-arched.png',
    'https://readdy.ai/api/search-image?query=Vintage%20arched%20frame%20with%20ornate%20gold%20detailing%20and%20curved%20top%2C%20transparent%20center%2C%20isolated%20on%20transparent%20background%2C%20antique%20wedding%20invitation%20frame%2C%20warm%20aged%20gold%20patina%2C%20classical%20elegant%20style%2C%20no%20text%2C%20no%20watermark%2C%20no%20shadow&width=500&height=560&seq=wedora-frame-03&orientation=portrait',
  ],
  [
    'icons/dove-pair.png',
    'https://readdy.ai/api/search-image?query=Two%20elegant%20white%20doves%20flying%20together%20in%20a%20graceful%20pose%2C%20simple%20line%20art%20illustration%20in%20warm%20gold%20tone%2C%20isolated%20on%20transparent%20background%2C%20wedding%20invitation%20icon%2C%20minimalist%20romantic%20style%2C%20clean%20silhouette%2C%20no%20text%20no%20watermark%20no%20shadow&width=400&height=400&seq=wedora-icon-01&orientation=squarish',
  ],
  [
    'icons/heart-silhouette.png',
    'https://readdy.ai/api/search-image?query=Elegant%20heart%20silhouette%20with%20delicate%20flourishes%2C%20simple%20gold%20line%20art%20illustration%2C%20isolated%20on%20transparent%20background%2C%20wedding%20invitation%20love%20icon%2C%20minimalist%20romantic%20style%2C%20clean%20shape%2C%20no%20text%20no%20watermark%20no%20shadow&width=400&height=400&seq=wedora-icon-02&orientation=squarish',
  ],
  [
    'icons/wedding-rings.png',
    'https://readdy.ai/api/search-image?query=Two%20interlocked%20wedding%20rings%20in%20elegant%20gold%20line%20art%20style%2C%20simple%20illustration%2C%20isolated%20on%20transparent%20background%2C%20wedding%20invitation%20rings%20icon%2C%20minimalist%20romantic%2C%20clean%20lines%2C%20no%20text%20no%20watermark%20no%20shadow&width=400&height=400&seq=wedora-icon-03&orientation=squarish',
  ],
  [
    'illustrations/botanical-archway.png',
    'https://readdy.ai/api/search-image?query=Elegant%20botanical%20archway%20made%20of%20flowering%20vines%20and%20greenery%20forming%20an%20arch%20shape%2C%20watercolor%20illustration%20in%20soft%20blush%20and%20sage%20tones%2C%20isolated%20on%20transparent%20background%2C%20wedding%20invitation%20decorative%20element%2C%20romantic%20garden%20style%2C%20no%20text%20no%20watermark%20no%20shadow&width=560&height=560&seq=wedora-illus-01&orientation=squarish',
  ],
  [
    'illustrations/line-art-couple.png',
    'https://readdy.ai/api/search-image?query=Elegant%20minimalist%20line%20art%20drawing%20of%20a%20bride%20and%20groom%20couple%20in%20embrace%2C%20single%20continuous%20gold%20line%2C%20isolated%20on%20transparent%20background%2C%20wedding%20invitation%20illustration%2C%20modern%20romantic%20style%2C%20no%20text%20no%20watermark%20no%20shadow&width=400&height=500&seq=wedora-illus-02&orientation=portrait',
  ],
  [
    'illustrations/watercolor-garden.png',
    'https://readdy.ai/api/search-image?query=Soft%20watercolor%20garden%20scene%20with%20scattered%20flowers%20and%20delicate%20greenery%20in%20blush%20pink%20and%20sage%20green%2C%20light%20airy%20wash%20style%2C%20isolated%20on%20transparent%20background%2C%20wedding%20invitation%20background%20illustration%2C%20dreamy%20romantic%20aesthetic%2C%20no%20text%20no%20watermark%20no%20frame&width=600&height=400&seq=wedora-illus-03&orientation=landscape',
  ],
  [
    'patterns/damask-motif.png',
    'https://readdy.ai/api/search-image?query=Elegant%20damask%20pattern%20motif%20in%20warm%20champagne%20gold%20on%20transparent%20background%2C%20ornate%20symmetrical%20design%2C%20luxury%20wedding%20invitation%20pattern%20element%2C%20vintage%20classical%20style%2C%20seamless%20tileable%20motif%2C%20no%20text%20no%20watermark%20no%20shadow&width=400&height=400&seq=wedora-pattern-01&orientation=squarish',
  ],
  [
    'patterns/filigree-swirl.png',
    'https://readdy.ai/api/search-image?query=Delicate%20filigree%20swirl%20pattern%20in%20soft%20gold%20tone%2C%20ornate%20decorative%20corner%20design%20with%20flowing%20curves%2C%20isolated%20on%20transparent%20background%2C%20wedding%20invitation%20ornament%2C%20elegant%20flourish%20style%2C%20no%20text%20no%20watermark%20no%20shadow&width=400&height=400&seq=wedora-pattern-02&orientation=squarish',
  ],
  [
    'patterns/geometric-lattice.png',
    'https://readdy.ai/api/search-image?query=Elegant%20geometric%20lattice%20pattern%20in%20warm%20champagne%20gold%2C%20interlocking%20diamond%20shapes%20with%20delicate%20lines%2C%20isolated%20on%20transparent%20background%2C%20modern%20wedding%20invitation%20pattern%2C%20art%20deco%20inspired%20geometric%20design%2C%20no%20text%20no%20watermark%20no%20shadow&width=400&height=400&seq=wedora-pattern-03&orientation=squarish',
  ],
];

function getThumbPath(fullPath: string): string {
  return fullPath.replace(/\.png$/, '-thumb.png');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  // Separate anon client used only to verify the caller's JWT; privileged
  // storage/database work stays on the service-role client above.
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: admin } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return new Response(JSON.stringify({ error: 'Administrator access required' }), { status: 403 });

  const results: { path: string; status: 'uploaded' | 'skipped' | 'failed'; error?: string }[] = [];

  for (const [storagePath, imageUrl] of ASSETS) {
    const thumbPath = getThumbPath(storagePath);
    const paths = [storagePath, thumbPath];

    // Check if full image already exists
    const { data: existingCheck } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60);

    if (existingCheck?.signedUrl) {
      results.push({ path: storagePath, status: 'skipped' });
      results.push({ path: thumbPath, status: 'skipped' });
      continue;
    }

    try {
      // Fetch image
      const imageResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
      if (!imageResp.ok) {
        const err = `Fetch failed: ${imageResp.status}`;
        results.push({ path: storagePath, status: 'failed', error: err });
        results.push({ path: thumbPath, status: 'failed', error: err });
        continue;
      }

      const imageBlob = await imageResp.blob();

      // Upload full-size and thumbnail (same blob — browser resizes in CSS)
      for (const path of paths) {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, imageBlob, {
            contentType: 'image/png',
            upsert: true,
            cacheControl: '31536000',
          });

        if (uploadError) {
          results.push({ path, status: 'failed', error: uploadError.message });
        } else {
          results.push({ path, status: 'uploaded' });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ path: storagePath, status: 'failed', error: msg });
      results.push({ path: thumbPath, status: 'failed', error: msg });
    }
  }

  const uploaded = results.filter((r) => r.status === 'uploaded').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  return new Response(
    JSON.stringify({ summary: { uploaded, skipped, failed, total: results.length }, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
