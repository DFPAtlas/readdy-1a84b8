import { useState, useEffect } from 'react';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';

interface DbImage {
  id: string;
  image_url: string;
  caption: string;
  section: string;
  sort_order: number;
}

interface SectionDef {
  id: string;
  title: string;
  icon: string;
}

interface StyleImage {
  id: string;
  url: string;
  caption: string;
}

interface SectionData {
  id: string;
  title: string;
  icon: string;
  images: StyleImage[];
}

const sectionDefs: SectionDef[] = [
  { id: 'flowers', title: 'Flowers & decor', icon: 'ri-flower-line' },
  { id: 'rings', title: 'Rings', icon: 'ri-heart-2-line' },
  { id: 'food', title: 'Food & menu', icon: 'ri-restaurant-line' },
  { id: 'brideAttire', title: 'Bride\'s attire', icon: 'ri-t-shirt-line' },
  { id: 'bridesmaidsAttire', title: 'Bridesmaids\' attire', icon: 'ri-women-line' },
  { id: 'groomAttire', title: 'Groom\'s attire', icon: 'ri-men-line' },
  { id: 'groomsmenAttire', title: 'Groomsmen attire', icon: 'ri-team-line' },
];

// ── Demo styleboard with sample inspiration images ──
function DemoStyleboard() {
  const demo = useDemoDataSafe();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [addModal, setAddModal] = useState<{ open: boolean; sectionId: string | null }>({ open: false, sectionId: null });
  const [newImage, setNewImage] = useState({ url: '', caption: '' });
  const [addError, setAddError] = useState('');

  const demoImages: Record<string, StyleImage[]> = {
    flowers: [
      { id: 'demo-f1', url: 'https://readdy.ai/api/search-image?query=Elegant%20spring%20wedding%20bouquet%20with%20white%20peonies%20and%20eucalyptus%2C%20soft%20natural%20light%2C%20pastel%20background%2C%20editorial%20floral%20photography&width=600&height=800&seq=style-f1&orientation=portrait', caption: 'White peony bouquet with eucalyptus' },
      { id: 'demo-f2', url: 'https://readdy.ai/api/search-image?query=Romantic%20wedding%20reception%20table%20centerpiece%20with%20cascading%20greenery%20and%20candlelight%2C%20warm%20ambient%20glow%2C%20fine%20art%20photography&width=600&height=800&seq=style-f2&orientation=portrait', caption: 'Greenery tablescape with candles' },
    ],
    rings: [
      { id: 'demo-r1', url: 'https://readdy.ai/api/search-image?query=Two%20elegant%20wedding%20rings%20on%20soft%20velvet%20cushion%2C%20rose%20gold%20and%20platinum%20bands%2C%20macro%20photography%20with%20warm%20bokeh%20background&width=600&height=800&seq=style-r1&orientation=portrait', caption: 'Rose gold & platinum bands' },
    ],
    food: [
      { id: 'demo-fd1', url: 'https://readdy.ai/api/search-image?query=Elegant%20three-tier%20wedding%20cake%20with%20white%20buttercream%20and%20fresh%20flowers%2C%20minimalist%20design%2C%20soft%20studio%20lighting%2C%20editorial%20food%20photography&width=600&height=800&seq=style-fd1&orientation=portrait', caption: 'Three-tier buttercream cake' },
      { id: 'demo-fd2', url: 'https://readdy.ai/api/search-image?query=Beautifully%20plated%20wedding%20reception%20starter%20course%20with%20edible%20flowers%2C%20fine%20dining%20presentation%2C%20warm%20natural%20light&width=600&height=800&seq=style-fd2&orientation=portrait', caption: 'Fine dining starter course' },
    ],
    brideAttire: [
      { id: 'demo-ba1', url: 'https://readdy.ai/api/search-image?query=Elegant%20A-line%20wedding%20dress%20with%20lace%20bodice%20and%20long%20train%2C%20hanging%20in%20bright%20boutique%20with%20natural%20light%2C%20editorial%20bridal%20photography&width=600&height=800&seq=style-ba1&orientation=portrait', caption: 'A-line lace gown' },
      { id: 'demo-ba2', url: 'https://readdy.ai/api/search-image?query=Delicate%20bridal%20veil%20with%20pearl%20embellishments%20draped%20over%20antique%20chair%2C%20soft%20window%20light%2C%20romantic%20atmosphere&width=600&height=800&seq=style-ba2&orientation=portrait', caption: 'Pearl-embellished veil' },
    ],
    bridesmaidsAttire: [
      { id: 'demo-bma1', url: 'https://readdy.ai/api/search-image?query=Row%20of%20sage%20green%20bridesmaid%20dresses%20hanging%20on%20brass%20rack%2C%20chiffon%20fabric%2C%20soft%20boutique%20lighting%2C%20editorial%20photography&width=600&height=800&seq=style-bma1&orientation=portrait', caption: 'Sage green chiffon dresses' },
    ],
    groomAttire: [
      { id: 'demo-ga1', url: 'https://readdy.ai/api/search-image?query=Tailored%20navy%20three-piece%20wedding%20suit%20on%20wooden%20hanger%20against%20neutral%20wall%2C%20classic%20menswear%20styling%2C%20clean%20editorial%20photography&width=600&height=800&seq=style-ga1&orientation=portrait', caption: 'Navy three-piece suit' },
    ],
    groomsmenAttire: [
      { id: 'demo-gma1', url: 'https://readdy.ai/api/search-image?query=Matching%20grey%20groomsmen%20suits%20with%20burgundy%20ties%20laid%20out%20on%20neutral%20linen%2C%20flat%20lay%20styling%2C%20editorial%20menswear%20photography&width=600&height=800&seq=style-gma1&orientation=portrait', caption: 'Grey suits with burgundy ties' },
    ],
  };

  useEffect(() => {
    setSections(
      sectionDefs.map((def) => ({
        ...def,
        images: demoImages[def.id] || [],
      }))
    );
  }, []);

  const handleOpenAdd = (sectionId: string) => {
    setAddModal({ open: true, sectionId });
    setNewImage({ url: '', caption: '' });
    setAddError('');
  };

  const handleCloseAdd = () => {
    setAddModal({ open: false, sectionId: null });
    setNewImage({ url: '', caption: '' });
    setAddError('');
  };

  const handleAddImage = () => {
    if (!newImage.url.trim()) { setAddError('Please enter an image URL'); return; }
    if (!newImage.caption.trim()) { setAddError('Please add a caption'); return; }
    if (!addModal.sectionId) return;

    const secId = addModal.sectionId;
    const imgId = `demo-added-${Date.now()}`;

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          images: [...sec.images, { id: imgId, url: newImage.url.trim(), caption: newImage.caption.trim() }],
        };
      }),
    );

    demo?.addDemoActivity({
      id: `demo-activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: `Added inspiration image to ${sectionDefs.find((d) => d.id === secId)?.title}`,
      category: 'setup',
      related_guest: '',
      wedding_id: demo?.state.wedding.id ?? '',
    });

    handleCloseAdd();
  };

  const handleRemoveImage = (sectionId: string, imageId: string) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s;
      return { ...s, images: s.images.filter((img) => img.id !== imageId) };
    }));
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding day styleboard</h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold">Demo Account</span>
          </div>
          <p className="text-sm text-foreground-500 mt-1">Collect inspiration images for every detail of your day — flowers, attire, food, and more</p>

          {/* Help banner */}
          <div className="mt-5 p-4 rounded-xl bg-accent-50 border border-accent-200/60">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center shrink-0 mt-0.5">
                <i className="ri-lightbulb-flash-line text-accent-600 text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-label font-medium text-accent-900">How the styleboard works</p>
                <ul className="mt-1.5 space-y-1 text-xs text-accent-700">
                  <li className="flex items-start gap-2">
                    <i className="ri-add-circle-line mt-0.5 text-accent-500 shrink-0" />
                    Click <strong className="text-accent-900">Add inspiration</strong> in any section to paste an image URL and caption
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-folder-image-line mt-0.5 text-accent-500 shrink-0" />
                    Organise by category — flowers, attire, food, rings, and more
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-delete-bin-line mt-0.5 text-accent-500 shrink-0" />
                    Hover over any image and click the X to remove it
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-save-line mt-0.5 text-accent-500 shrink-0" />
                    All changes are saved in your browser during the demo
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.id} className="card-default">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                  <i className={`${section.icon} text-accent-600 text-lg`} />
                </div>
                <div className="flex-1">
                  <h2 className="font-label text-sm font-semibold text-foreground-900">{section.title}</h2>
                  <p className="text-xs text-foreground-500">{section.images.length} {section.images.length === 1 ? 'image' : 'images'}</p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {section.images.map((image) => (
                  <div key={image.id} className="group relative flex-shrink-0 w-[200px] md:w-[220px]">
                    <div className="relative rounded-lg overflow-hidden bg-background-100 aspect-[3/4]">
                      <img src={image.url} alt={image.caption} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                      <button
                        onClick={() => handleRemoveImage(section.id, image.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-foreground-700 hover:bg-red-50 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                        aria-label={`Remove ${image.caption}`}
                      >
                        <i className="ri-close-line text-sm" />
                      </button>
                    </div>
                    <p className="text-xs text-foreground-600 mt-2 leading-snug line-clamp-2">{image.caption}</p>
                  </div>
                ))}

                <button
                  onClick={() => handleOpenAdd(section.id)}
                  className="flex-shrink-0 w-[200px] md:w-[220px] aspect-[3/4] rounded-lg border-2 border-dashed border-secondary-300 hover:border-accent-400 hover:bg-accent-50/50 flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary-100 group-hover:bg-accent-100 flex items-center justify-center transition-colors">
                    <i className="ri-add-line text-secondary-500 group-hover:text-accent-600 text-xl transition-colors" />
                  </div>
                  <span className="text-xs font-label text-foreground-500 group-hover:text-accent-600 transition-colors">Add inspiration</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {addModal.open && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={handleCloseAdd} aria-hidden="true" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100">
                  <h3 className="font-label text-sm font-semibold text-foreground-900">Add inspiration image</h3>
                  <button onClick={handleCloseAdd} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer">
                    <i className="ri-close-line text-lg" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {addError && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{addError}</div>}
                  <div>
                    <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Image URL</label>
                    <input type="text" value={newImage.url} onChange={(e) => { setNewImage((prev) => ({ ...prev, url: e.target.value })); setAddError(''); }} placeholder="https://..." className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Caption</label>
                    <input type="text" value={newImage.caption} onChange={(e) => { setNewImage((prev) => ({ ...prev, caption: e.target.value })); setAddError(''); }} placeholder="e.g. Spring bouquet inspiration" className="input-field" />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-secondary-100">
                  <button onClick={handleCloseAdd} className="px-4 py-2 text-sm font-label text-foreground-600 hover:text-foreground-900 hover:bg-background-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
                  <button onClick={handleAddImage} className="px-4 py-2 text-sm font-label bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors cursor-pointer whitespace-nowrap">Add image</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Normal (Supabase) styleboard ──
function NormalStyleboard() {
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sections, setSections] = useState<SectionData[]>([]);

  const [addModal, setAddModal] = useState<{ open: boolean; sectionId: string | null }>({ open: false, sectionId: null });
  const [newImage, setNewImage] = useState({ url: '', caption: '' });
  const [addError, setAddError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchImages = async () => {
      if (!weddingId) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const { data, error: dbErr } = await supabase
          .from('wedding_styleboard')
          .select('id, image_url, caption, section, sort_order')
          .eq('wedding_id', weddingId)
          .order('sort_order');

        if (cancelled) return;
        if (dbErr) throw dbErr;

        const imagesBySection: Record<string, StyleImage[]> = {};
        (data || []).forEach((img: DbImage) => {
          if (!imagesBySection[img.section]) imagesBySection[img.section] = [];
          imagesBySection[img.section].push({ id: img.id, url: img.image_url, caption: img.caption });
        });

        setSections(
          sectionDefs.map((def) => ({
            ...def,
            images: imagesBySection[def.id] || [],
          }))
        );
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchImages();
    return () => { cancelled = true; };
  }, [weddingId]);

  const handleOpenAdd = (sectionId: string) => {
    setAddModal({ open: true, sectionId });
    setNewImage({ url: '', caption: '' });
    setAddError('');
  };

  const handleCloseAdd = () => {
    setAddModal({ open: false, sectionId: null });
    setNewImage({ url: '', caption: '' });
    setAddError('');
  };

  const handleAddImage = async () => {
    if (!newImage.url.trim()) { setAddError('Please enter an image URL'); return; }
    if (!newImage.caption.trim()) { setAddError('Please add a caption'); return; }
    if (!addModal.sectionId || !weddingId) return;

    const secId = addModal.sectionId;
    const existing = sections.find((s) => s.id === secId);
    const sortOrder = (existing?.images.length || 0);

    try {
      const { data, error: dbErr } = await supabase
        .from('wedding_styleboard')
        .insert({
          wedding_id: weddingId,
          section: secId,
          image_url: newImage.url.trim(),
          caption: newImage.caption.trim(),
          sort_order: sortOrder,
        })
        .select('id')
        .single();

      if (dbErr) throw dbErr;

      setSections((prev) =>
        prev.map((sec) => {
          if (sec.id !== secId) return sec;
          return {
            ...sec,
            images: [...sec.images, { id: data.id, url: newImage.url.trim(), caption: newImage.caption.trim() }],
          };
        }),
      );
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add image');
      return;
    }

    handleCloseAdd();
  };

  const handleRemoveImage = async (sectionId: string, imageId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s;
      return { ...s, images: s.images.filter((img) => img.id !== imageId) };
    }));
    await supabase.from('wedding_styleboard').delete().eq('id', imageId);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading styleboard...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-primary-600 cursor-pointer hover:text-primary-700 whitespace-nowrap">Try again</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding day styleboard</h1>
          <p className="text-sm text-foreground-500 mt-1">Collect inspiration images for every detail of your day — flowers, attire, food, and more</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.id} className="card-default">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                  <i className={`${section.icon} text-accent-600 text-lg`} />
                </div>
                <div className="flex-1">
                  <h2 className="font-label text-sm font-semibold text-foreground-900">{section.title}</h2>
                  <p className="text-xs text-foreground-500">{section.images.length} {section.images.length === 1 ? 'image' : 'images'}</p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {section.images.map((image) => (
                  <div key={image.id} className="group relative flex-shrink-0 w-[200px] md:w-[220px]">
                    <div className="relative rounded-lg overflow-hidden bg-background-100 aspect-[3/4]">
                      <img src={image.url} alt={image.caption} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                      <button
                        onClick={() => handleRemoveImage(section.id, image.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-foreground-700 hover:bg-red-50 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                        aria-label={`Remove ${image.caption}`}
                      >
                        <i className="ri-close-line text-sm" />
                      </button>
                    </div>
                    <p className="text-xs text-foreground-600 mt-2 leading-snug line-clamp-2">{image.caption}</p>
                  </div>
                ))}

                <button
                  onClick={() => handleOpenAdd(section.id)}
                  className="flex-shrink-0 w-[200px] md:w-[220px] aspect-[3/4] rounded-lg border-2 border-dashed border-secondary-300 hover:border-accent-400 hover:bg-accent-50/50 flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary-100 group-hover:bg-accent-100 flex items-center justify-center transition-colors">
                    <i className="ri-add-line text-secondary-500 group-hover:text-accent-600 text-xl transition-colors" />
                  </div>
                  <span className="text-xs font-label text-foreground-500 group-hover:text-accent-600 transition-colors">Add inspiration</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {addModal.open && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={handleCloseAdd} aria-hidden="true" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100">
                  <h3 className="font-label text-sm font-semibold text-foreground-900">Add inspiration image</h3>
                  <button onClick={handleCloseAdd} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer">
                    <i className="ri-close-line text-lg" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {addError && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{addError}</div>}
                  <div>
                    <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Image URL</label>
                    <input type="text" value={newImage.url} onChange={(e) => { setNewImage((prev) => ({ ...prev, url: e.target.value })); setAddError(''); }} placeholder="https://..." className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Caption</label>
                    <input type="text" value={newImage.caption} onChange={(e) => { setNewImage((prev) => ({ ...prev, caption: e.target.value })); setAddError(''); }} placeholder="e.g. Spring bouquet inspiration" className="input-field" />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-secondary-100">
                  <button onClick={handleCloseAdd} className="px-4 py-2 text-sm font-label text-foreground-600 hover:text-foreground-900 hover:bg-background-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
                  <button onClick={handleAddImage} className="px-4 py-2 text-sm font-label bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors cursor-pointer whitespace-nowrap">Add image</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Export ──
export default function StyleboardPage() {
  if (isDemoMode) return <DemoStyleboard />;
  return <NormalStyleboard />;
}