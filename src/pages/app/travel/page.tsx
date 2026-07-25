import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useTravelPlaces } from '@/hooks/useTravelPlaces';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { DemoTravelPlace } from '@/demo/demoTypes';
import type { TravelPlace, TravelPlaceFormData, DiscoveryResult } from '@/types/travel';
import { TRAVEL_CATEGORIES, APPROVAL_STATUS_LABELS, APPROVAL_STATUS_COLORS, PRICE_COLORS, PLACE_TYPE_ICONS, emptyPlaceForm, getCategoryGroup } from '@/types/travel';

type FilterTab = 'all' | 'approved' | 'pending' | 'hidden' | 'featured';

export default function TravelAdminPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const isDemo = !!demo;
  const { weddingId, wedding } = useActiveWedding();
  const travelHook = useTravelPlaces();
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── State ──
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<TravelPlace | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [addForm, setAddForm] = useState<TravelPlaceFormData>(emptyPlaceForm());
  const [editForm, setEditForm] = useState<TravelPlace | null>(null);

  // Discovery state
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [discoveryCategory, setDiscoveryCategory] = useState('');
  const [discoveryRadius, setDiscoveryRadius] = useState(5);
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [discoveryImporting, setDiscoveryImporting] = useState<string[]>([]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => { if (mountedRef.current) setToast(null); }, 3500);
  }, []);

  // ── Demo places ──
  const demoPlaces = useMemo(() => {
    if (!isDemo || !demo) return [] as DemoTravelPlace[];
    return demo.state.travelPlaces;
  }, [isDemo, demo]);

  // ── Supabase places ──
  const { places: dbPlaces, loading: dbLoading, error: dbError, stats: dbStats, saving, createPlace, updatePlace, deletePlace, bulkApprove, bulkHide, discoverPlaces, geocodeAddress } = travelHook;

  // ── Unified data ──
  const placesForDisplay = useMemo(() => {
    if (isDemo) return demoPlaces;
    return dbPlaces;
  }, [isDemo, demoPlaces, dbPlaces]);

  const statsForDisplay = useMemo(() => {
    if (isDemo) {
      const catMap: Record<string, number> = {};
      demoPlaces.forEach((p) => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
      return {
        total: demoPlaces.length,
        approved: demoPlaces.filter((p) => p.approval_status === 'approved').length,
        pending: demoPlaces.filter((p) => p.approval_status === 'pending').length,
        hidden: demoPlaces.filter((p) => p.approval_status === 'hidden').length,
        featured: demoPlaces.filter((p) => p.featured).length,
        byCategory: catMap,
      };
    }
    return dbStats;
  }, [isDemo, demoPlaces, dbStats]);

  const filteredPlaces = useMemo(() => {
    return placesForDisplay.filter((p) => {
      const name = p.name || '';
      const cat = isDemo ? (p as DemoTravelPlace).category : (p as TravelPlace).place_type;
      const addr = isDemo ? (p as DemoTravelPlace).address : ((p as TravelPlace).address_line_1 || '');
      const status = isDemo ? (p as DemoTravelPlace).approval_status : (p as TravelPlace).approval_status;
      const featured = isDemo ? (p as DemoTravelPlace).featured : (p as TravelPlace).is_featured;

      if (search && !name.toLowerCase().includes(search.toLowerCase()) && !cat.toLowerCase().includes(search.toLowerCase()) && !addr.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTab === 'approved' && status !== 'approved') return false;
      if (filterTab === 'pending' && status !== 'pending') return false;
      if (filterTab === 'hidden' && status !== 'hidden') return false;
      if (filterTab === 'featured' && !featured) return false;
      if (categoryFilter && cat !== categoryFilter) return false;
      return true;
    });
  }, [placesForDisplay, search, filterTab, categoryFilter, isDemo]);

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return placesForDisplay.find((p) => p.id === selectedPlaceId) || null;
  }, [selectedPlaceId, placesForDisplay]);

  const venue = useMemo(() => demo?.state.venues?.[0] || null, [demo]);

  // ── Category breakdown for non-demo ──
  const catBreakdown = useMemo(() => {
    const groups: { label: string; key: string; icon: string; value: number }[] = [
      { label: 'Accommodation', key: 'accommodation', icon: 'ri-hotel-line', value: 0 },
      { label: 'Food & Drink', key: 'foodDrink', icon: 'ri-restaurant-line', value: 0 },
      { label: 'Transport', key: 'transport', icon: 'ri-car-line', value: 0 },
      { label: 'Essentials', key: 'essentials', icon: 'ri-shopping-bag-line', value: 0 },
      { label: 'Things to Do', key: 'thingsToDo', icon: 'ri-landscape-line', value: 0 },
    ];
    placesForDisplay.forEach((p) => {
      const cat = isDemo ? (p as DemoTravelPlace).category : (p as TravelPlace).place_type;
      const group = getCategoryGroup(cat);
      const g = groups.find((g) => g.key === group);
      if (g) g.value++;
    });
    return groups;
  }, [placesForDisplay, isDemo]);

  // ── Actions ──
  const handleApprove = useCallback(async (placeId: string) => {
    if (isDemo && demo) {
      demo.approveTravelPlace(placeId);
      showToast('Place approved and visible to guests');
      return;
    }
    try {
      await updatePlace(placeId, { approval_status: 'approved', is_approved: true });
      showToast('Place approved and visible to guests');
    } catch { showToast('Failed to approve', 'error'); }
  }, [isDemo, demo, updatePlace, showToast]);

  const handleHide = useCallback(async (placeId: string) => {
    if (isDemo && demo) {
      demo.hideTravelPlace(placeId);
      showToast('Place hidden from guests');
      return;
    }
    try {
      await updatePlace(placeId, { approval_status: 'hidden', is_approved: false });
      showToast('Place hidden from guests');
    } catch { showToast('Failed to hide', 'error'); }
  }, [isDemo, demo, updatePlace, showToast]);

  const handleFeature = useCallback(async (placeId: string, featured: boolean) => {
    if (isDemo && demo) {
      demo.featureTravelPlace(placeId, featured);
      showToast(featured ? 'Place featured' : 'Place unfeatured');
      return;
    }
    try {
      await updatePlace(placeId, { is_featured: featured } as Partial<TravelPlace>);
      showToast(featured ? 'Place featured' : 'Place unfeatured');
    } catch { showToast('Failed to update', 'error'); }
  }, [isDemo, demo, updatePlace, showToast]);

  // ── Add (manual) ──
  const handleAddPlace = useCallback(async () => {
    if (!addForm.name.trim() || !addForm.place_type) {
      showToast('Name and category are required', 'error');
      return;
    }
    if (isDemo && demo) {
      const newPlace: DemoTravelPlace = {
        id: demo.generateDemoId('demo-place'),
        wedding_id: demo.state.wedding.id,
        name: addForm.name.trim(),
        category: addForm.place_type,
        short_description: addForm.description.trim(),
        address: addForm.address_line_1.trim(),
        city: addForm.city.trim(),
        postcode: addForm.postcode.trim(),
        distance_miles: parseFloat(addForm.distance_from_venue) || 0,
        journey_time_minutes: parseInt(addForm.estimated_travel_time) || 0,
        website_url: addForm.website.trim(),
        phone: addForm.telephone.trim(),
        approval_status: addForm.approval_status,
        featured: addForm.is_featured,
        couple_note: addForm.couple_note.trim(),
        price_tag: addForm.price_level as DemoTravelPlace['price_tag'],
      };
      demo.addTravelPlace(newPlace);
      showToast(`"${newPlace.name}" added`);
    } else {
      try {
        await createPlace(addForm);
        showToast(`"${addForm.name}" added`);
      } catch { showToast('Failed to add place', 'error'); return; }
    }
    setShowAddModal(false);
    setAddForm(emptyPlaceForm());
  }, [isDemo, demo, addForm, createPlace, showToast]);

  // ── Edit ──
  const handleSaveEdit = useCallback(async () => {
    if (!editForm) return;
    if (isDemo && demo) {
      demo.updateTravelPlace(editForm.id, {
        name: editForm.name,
        category: (editForm as unknown as { place_type?: string }).place_type || (editForm as unknown as { category?: string }).category,
        short_description: editForm.description || '',
        address: editForm.address_line_1 || '',
        city: editForm.city || '',
        postcode: editForm.postcode || '',
        distance_miles: editForm.distance_from_venue || 0,
        journey_time_minutes: editForm.estimated_travel_time || 0,
        website_url: editForm.website || '',
        phone: editForm.telephone || '',
        couple_note: editForm.couple_note || '',
        price_tag: (editForm.price_level || 'standard') as DemoTravelPlace['price_tag'],
      });
      showToast(`"${editForm.name}" updated`);
    } else {
      try {
        const updates: Partial<TravelPlace> = {
          name: editForm.name,
          place_type: editForm.place_type,
          description: editForm.description,
          address_line_1: editForm.address_line_1,
          city: editForm.city,
          postcode: editForm.postcode,
          country: editForm.country,
          website: editForm.website,
          telephone: editForm.telephone,
          couple_note: editForm.couple_note,
          price_level: editForm.price_level,
          distance_from_venue: editForm.distance_from_venue,
          estimated_travel_time: editForm.estimated_travel_time,
          opening_info: editForm.opening_info,
          accessibility_info: editForm.accessibility_info,
          is_featured: editForm.is_featured,
          approval_status: editForm.approval_status,
          is_approved: editForm.approval_status === 'approved',
        };
        await updatePlace(editForm.id, updates);
        showToast(`"${editForm.name}" updated`);
      } catch { showToast('Failed to update', 'error'); return; }
    }
    setShowEditModal(false);
    setEditForm(null);
    setSelectedPlaceId(null);
  }, [isDemo, demo, editForm, updatePlace, showToast]);

  const handleDelete = useCallback(async () => {
    if (!showDeleteConfirm) return;
    if (isDemo) {
      showToast('Delete not available in demo mode', 'info');
      setShowDeleteConfirm(null);
      return;
    }
    try {
      await deletePlace(showDeleteConfirm.id);
      showToast(`"${showDeleteConfirm.name}" deleted`);
      if (selectedPlaceId === showDeleteConfirm.id) setSelectedPlaceId(null);
    } catch { showToast('Failed to delete', 'error'); }
    setShowDeleteConfirm(null);
  }, [isDemo, showDeleteConfirm, deletePlace, showToast, selectedPlaceId]);

  // ── Discovery ──
  const handleDiscover = useCallback(async () => {
    if (isDemo) { showToast('Discovery requires Supabase and Google API key', 'info'); return; }
    setDiscoveryLoading(true);
    setDiscoveryError('');
    setDiscoveryResults([]);

    // Try to geocode the venue address
    const venueRef = venue;
    const venueAddr = [venueRef?.address_line_1, venueRef?.city, venueRef?.county_or_region, venueRef?.postcode].filter(Boolean).join(', ');
    let lat = 0; let lng = 0;

    if (venueAddr) {
      const geo = await geocodeAddress(venueAddr);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }

    if (!lat || !lng) {
      setDiscoveryError('Could not determine venue location. Try entering a specific address or coordinates.');
      setDiscoveryLoading(false);
      return;
    }

    const result = await discoverPlaces({
      venue_lat: lat,
      venue_lng: lng,
      radius_miles: discoveryRadius,
      category: discoveryCategory || undefined,
      query: discoveryQuery || undefined,
    });

    if (result.error) {
      setDiscoveryError(result.error);
    } else {
      setDiscoveryResults(result.results);
      if (result.results.length === 0) setDiscoveryError('No places found. Try a different category or wider radius.');
    }
    setDiscoveryLoading(false);
  }, [isDemo, venue, geocodeAddress, discoverPlaces, discoveryRadius, discoveryCategory, discoveryQuery, showToast]);

  const handleImportDiscovered = useCallback(async (result: DiscoveryResult) => {
    if (isDemo) return;
    setDiscoveryImporting((prev) => [...prev, result.google_place_id]);
    try {
      const placeType = discoveryCategory || result.place_types?.[0]?.replace(/_/g, '_') || 'attraction';
      await createPlace({
        name: result.name,
        place_type: placeType,
        description: '',
        address_line_1: result.address_line_1 || '',
        city: '',
        postcode: '',
        country: '',
        website: '',
        telephone: '',
        couple_note: '',
        approval_status: 'pending',
        is_featured: false,
        price_level: result.price_level || 'standard',
        distance_from_venue: '',
        estimated_travel_time: '',
        opening_info: '',
        accessibility_info: '',
      });
      // Also update with google_place_id and lat/lng
      showToast(`"${result.name}" imported`);
    } catch { showToast(`Failed to import "${result.name}"`, 'error'); }
    setDiscoveryImporting((prev) => prev.filter((id) => id !== result.google_place_id));
  }, [isDemo, discoveryCategory, createPlace, showToast]);

  // ── Loading state ──
  const loading = !isDemo && dbLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-background-200 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-background-100 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-background-100 rounded-lg" />)}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Error state ──
  if (!isDemo && dbError) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
            <i className="ri-error-warning-line text-2xl" />
          </div>
          <p className="text-sm text-foreground-500 mb-4">{dbError}</p>
          <button onClick={() => travelHook.fetchPlaces()} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Try again</button>
        </div>
      </AppShell>
    );
  }

  // ── Non-demo, no wedding ──
  if (!isDemo && !weddingId) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-sm text-foreground-500 mb-4">Select a wedding to manage travel recommendations.</p>
          <button onClick={() => navigate('/app/dashboard')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back to dashboard</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Travel Concierge</h1>
              {isDemo && <span className="px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-label font-semibold">Demo</span>}
            </div>
            <p className="text-sm text-foreground-500 mt-1">Curate accommodation, transport and local recommendations for your guests.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isDemo && (
              <>
                <button onClick={() => navigate('/w/emma-and-james')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
                  <i className="ri-eye-line mr-1.5" />Preview public
                </button>
                <button onClick={() => navigate('/guest/demo-session/travel')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
                  <i className="ri-user-line mr-1.5" />Guest preview
                </button>
              </>
            )}
            <button onClick={() => { setShowDiscoverModal(true); setDiscoveryResults([]); setDiscoveryError(''); }} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-search-line mr-1.5" />Discover places
            </button>
            <button onClick={() => { setAddForm(emptyPlaceForm()); setShowAddModal(true); }} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1.5" />Add place
            </button>
          </div>
        </div>

        {/* Help banner */}
        <div className="mb-6 px-4 py-3 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-base" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">How Travel Concierge works</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">
              Add local recommendations and approve which ones guests see. Use <strong>Discover</strong> to search nearby with Google Places (requires API key), or add places manually. Only <strong>approved</strong> places appear in the guest portal.
              {isDemo && ' This is demo data — changes are not saved permanently.'}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: statsForDisplay.total, icon: 'ri-map-pin-line', color: 'text-foreground-700', bg: 'bg-background-100' },
            { label: 'Approved', value: statsForDisplay.approved, icon: 'ri-check-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending', value: statsForDisplay.pending, icon: 'ri-time-line', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Featured', value: statsForDisplay.featured, icon: 'ri-star-line', color: 'text-accent-600', bg: 'bg-accent-50' },
            { label: 'Hidden', value: statsForDisplay.hidden, icon: 'ri-eye-off-line', color: 'text-foreground-400', bg: 'bg-secondary-100' },
          ].map((card) => (
            <div key={card.label} className="card-default">
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${card.bg} ${card.color} mb-3`}>
                <i className={`${card.icon} text-sm`} />
              </div>
              <p className="text-2xl font-heading font-semibold text-foreground-900">{card.value}</p>
              <p className="text-xs text-foreground-500 font-label mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {catBreakdown.map((cat) => (
            <div key={cat.key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 bg-white">
              <i className={`${cat.icon} text-foreground-400 text-sm`} />
              <div>
                <p className="text-[10px] text-foreground-500">{cat.label}</p>
                <p className="text-xs font-label font-semibold text-foreground-800">{cat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { key: 'all', label: 'All' },
              { key: 'approved', label: 'Approved' },
              { key: 'pending', label: 'Pending' },
              { key: 'featured', label: 'Featured' },
              { key: 'hidden', label: 'Hidden' },
            ] as { key: FilterTab; label: string }[]).map((tab) => (
              <button key={tab.key} onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-label cursor-pointer whitespace-nowrap transition-colors ${filterTab === tab.key ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-foreground-500 hover:bg-background-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-secondary-200 text-[11px] text-foreground-600 bg-white cursor-pointer">
              <option value="">All categories</option>
              {TRAVEL_CATEGORIES.map((c) => <option key={c.key} value={c.placeType}>{c.label}</option>)}
            </select>
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-48 pl-7 pr-3 py-1.5 rounded-lg border border-secondary-200 text-[11px] focus:outline-none focus:border-primary-400" />
            </div>
          </div>
        </div>

        {/* Place list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredPlaces.length === 0 ? (
            <div className="col-span-2 text-center py-14">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3">
                <i className="ri-map-pin-line text-2xl" />
              </div>
              <p className="text-sm text-foreground-500 mb-4">
                {placesForDisplay.length === 0 ? 'No places added yet. Add your first recommendation or use Discover to find local places.' : 'No places match your filters.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {placesForDisplay.length === 0 ? (
                  <button onClick={() => { setAddForm(emptyPlaceForm()); setShowAddModal(true); }} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
                    <i className="ri-add-line mr-1" />Add your first place
                  </button>
                ) : (
                  <button onClick={() => { setFilterTab('all'); setSearch(''); setCategoryFilter(''); }} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Clear filters</button>
                )}
              </div>
            </div>
          ) : (
            filteredPlaces.map((place) => {
              const isSelected = selectedPlaceId === place.id;
              const name = place.name;
              const status = isDemo ? (place as DemoTravelPlace).approval_status : (place as TravelPlace).approval_status;
              const featured = isDemo ? (place as DemoTravelPlace).featured : (place as TravelPlace).is_featured;
              const cat = isDemo ? (place as DemoTravelPlace).category : (place as TravelPlace).place_type;
              const description = isDemo ? (place as DemoTravelPlace).short_description : (place as TravelPlace).description;
              const address = isDemo ? `${(place as DemoTravelPlace).address}, ${(place as DemoTravelPlace).city} ${(place as DemoTravelPlace).postcode}` : [(place as TravelPlace).address_line_1, (place as TravelPlace).city, (place as TravelPlace).postcode].filter(Boolean).join(', ');
              const coupleNote = isDemo ? (place as DemoTravelPlace).couple_note : (place as TravelPlace).couple_note;
              const priceLabel = isDemo ? (place as DemoTravelPlace).price_tag : (place as TravelPlace).price_level;
              const distance = isDemo ? (place as DemoTravelPlace).distance_miles : (place as TravelPlace).distance_from_venue;
              const travelTime = isDemo ? (place as DemoTravelPlace).journey_time_minutes : (place as TravelPlace).estimated_travel_time;
              const website = isDemo ? (place as DemoTravelPlace).website_url : (place as TravelPlace).website;
              const phone = isDemo ? (place as DemoTravelPlace).phone : (place as TravelPlace).telephone;
              const rating = (place as TravelPlace).provider_rating;
              const icon = PLACE_TYPE_ICONS[cat] || 'ri-map-pin-line';

              return (
                <div key={place.id} className={`bg-white rounded-lg border transition-colors ${isSelected ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200 hover:border-secondary-300'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setSelectedPlaceId(isSelected ? null : place.id)} className="text-left cursor-pointer">
                          <h3 className="text-sm font-label font-semibold text-foreground-900 hover:text-primary-600 transition-colors">{name}</h3>
                        </button>
                        {address && <p className="text-[11px] text-foreground-500 mt-0.5 truncate">{address}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {featured && <span className="w-1.5 h-1.5 rounded-full bg-accent-400" title="Featured" />}
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-label font-semibold ${APPROVAL_STATUS_COLORS[status] || 'bg-secondary-100 text-foreground-500'}`}>
                          {APPROVAL_STATUS_LABELS[status] || status}
                        </span>
                      </div>
                    </div>

                    {description && <p className="text-xs text-foreground-600 line-clamp-2 mb-3">{description}</p>}

                    <div className="flex items-center gap-3 text-[10px] text-foreground-500 mb-3 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-background-50 text-foreground-600 font-label">{cat}</span>
                      {priceLabel && <span className={`px-1.5 py-0.5 rounded font-label capitalize ${PRICE_COLORS[priceLabel] || 'bg-background-50 text-foreground-600'}`}>{priceLabel}</span>}
                      {distance && Number(distance) > 0 && <span><i className="ri-map-pin-line text-[10px]" /> {distance} mi</span>}
                      {travelTime && Number(travelTime) > 0 && <span><i className="ri-time-line text-[10px]" /> {travelTime} min</span>}
                      {rating && <span className="flex items-center gap-0.5 text-amber-600"><i className="ri-star-fill text-[10px]" />{rating}</span>}
                    </div>

                    {coupleNote && (
                      <p className="text-[10px] text-primary-600 italic mb-3"><i className="ri-heart-fill text-[9px] mr-1" />{coupleNote}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {status !== 'approved' && (
                        <button onClick={() => handleApprove(place.id)} className="px-2 py-1 rounded text-[10px] font-label bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer whitespace-nowrap">
                          <i className="ri-check-line mr-0.5" />Approve
                        </button>
                      )}
                      {status === 'approved' && (
                        <button onClick={() => handleHide(place.id)} className="px-2 py-1 rounded text-[10px] font-label bg-secondary-100 text-foreground-500 hover:bg-secondary-200 cursor-pointer whitespace-nowrap">
                          <i className="ri-eye-off-line mr-0.5" />Hide
                        </button>
                      )}
                      {status === 'hidden' && (
                        <button onClick={() => handleApprove(place.id)} className="px-2 py-1 rounded text-[10px] font-label bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer whitespace-nowrap">
                          <i className="ri-eye-line mr-0.5" />Unhide
                        </button>
                      )}
                      <button onClick={() => handleFeature(place.id, !featured)}
                        className={`px-2 py-1 rounded text-[10px] font-label cursor-pointer whitespace-nowrap ${featured ? 'bg-accent-100 text-accent-700 hover:bg-accent-200' : 'bg-background-50 text-foreground-500 hover:bg-background-100'}`}>
                        <i className={`${featured ? 'ri-star-fill' : 'ri-star-line'} mr-0.5`} />
                        {featured ? 'Featured' : 'Feature'}
                      </button>
                      <button onClick={() => { setEditForm(place as TravelPlace); setShowEditModal(true); }}
                        className="px-2 py-1 rounded text-[10px] font-label text-foreground-500 hover:bg-background-50 cursor-pointer whitespace-nowrap">
                        <i className="ri-edit-line mr-0.5" />Edit
                      </button>
                      <button onClick={() => setShowDeleteConfirm(place as TravelPlace)}
                        className="px-2 py-1 rounded text-[10px] font-label text-foreground-500 hover:bg-red-50 hover:text-red-600 cursor-pointer whitespace-nowrap">
                        <i className="ri-delete-bin-line mr-0.5" />Delete
                      </button>
                      {website && (
                        <a href={website} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 rounded text-[10px] font-label text-foreground-500 hover:bg-background-50 cursor-pointer whitespace-nowrap">
                          <i className="ri-external-link-line mr-0.5" />Visit
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg text-foreground-900">Add Place</h2>
              <button onClick={() => setShowAddModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Name *</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" placeholder="e.g. The Royal Crescent Hotel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Category *</label>
                  <select value={addForm.place_type} onChange={(e) => setAddForm((f) => ({ ...f, place_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 cursor-pointer">
                    {TRAVEL_CATEGORIES.map((c) => <option key={c.key} value={c.placeType}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Price level</label>
                  <select value={addForm.price_level} onChange={(e) => setAddForm((f) => ({ ...f, price_level: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 cursor-pointer">
                    <option value="budget">Budget</option>
                    <option value="standard">Standard</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Description</label>
                <textarea value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none" placeholder="Short description for guests..." />
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Address</label>
                <input type="text" value={addForm.address_line_1} onChange={(e) => setAddForm((f) => ({ ...f, address_line_1: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">City</label>
                  <input type="text" value={addForm.city} onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Postcode</label>
                  <input type="text" value={addForm.postcode} onChange={(e) => setAddForm((f) => ({ ...f, postcode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Distance (miles)</label>
                  <input type="text" value={addForm.distance_from_venue} onChange={(e) => setAddForm((f) => ({ ...f, distance_from_venue: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" placeholder="0.5" />
                </div>
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Travel time (min)</label>
                  <input type="text" value={addForm.estimated_travel_time} onChange={(e) => setAddForm((f) => ({ ...f, estimated_travel_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" placeholder="10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Website</label>
                  <input type="text" value={addForm.website} onChange={(e) => setAddForm((f) => ({ ...f, website: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Phone</label>
                  <input type="text" value={addForm.telephone} onChange={(e) => setAddForm((f) => ({ ...f, telephone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Couple note (guest-visible)</label>
                <textarea value={addForm.couple_note} onChange={(e) => setAddForm((f) => ({ ...f, couple_note: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none" placeholder="A personal note for your guests..." />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={addForm.is_featured} onChange={(e) => setAddForm((f) => ({ ...f, is_featured: e.target.checked }))} className="rounded" />
                  <span className="text-[11px] text-foreground-600">Featured</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={addForm.approval_status === 'approved'} onChange={(e) => setAddForm((f) => ({ ...f, approval_status: e.target.checked ? 'approved' : 'pending' }))} className="rounded" />
                  <span className="text-[11px] text-foreground-600">Approve immediately</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={handleAddPlace} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                {saving ? <i className="ri-loader-4-line animate-spin mr-1" /> : null}Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg text-foreground-900">Edit Place</h2>
              <button onClick={() => setShowEditModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Category</label>
                  <select value={editForm.place_type} onChange={(e) => setEditForm((f) => f ? { ...f, place_type: e.target.value } : f)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 cursor-pointer">
                    {TRAVEL_CATEGORIES.map((c) => <option key={c.key} value={c.placeType}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Status</label>
                  <select value={editForm.approval_status} onChange={(e) => setEditForm((f) => f ? { ...f, approval_status: e.target.value as TravelPlace['approval_status'] } : f)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 cursor-pointer">
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Description</label>
                <textarea value={editForm.description || ''} onChange={(e) => setEditForm((f) => f ? { ...f, description: e.target.value } : f)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Address</label>
                <input type="text" value={editForm.address_line_1 || ''} onChange={(e) => setEditForm((f) => f ? { ...f, address_line_1: e.target.value } : f)}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Distance (miles)</label>
                  <input type="text" value={editForm.distance_from_venue || ''} onChange={(e) => setEditForm((f) => f ? { ...f, distance_from_venue: parseFloat(e.target.value) || null } : f)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Travel time (min)</label>
                  <input type="text" value={editForm.estimated_travel_time || ''} onChange={(e) => setEditForm((f) => f ? { ...f, estimated_travel_time: parseInt(e.target.value) || null } : f)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Website</label>
                  <input type="text" value={editForm.website || ''} onChange={(e) => setEditForm((f) => f ? { ...f, website: e.target.value } : f)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Phone</label>
                  <input type="text" value={editForm.telephone || ''} onChange={(e) => setEditForm((f) => f ? { ...f, telephone: e.target.value } : f)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-700 mb-1">Couple note</label>
                <textarea value={editForm.couple_note || ''} onChange={(e) => setEditForm((f) => f ? { ...f, couple_note: e.target.value } : f)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none" />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={!!editForm.is_featured} onChange={(e) => setEditForm((f) => f ? { ...f, is_featured: e.target.checked } : f)} className="rounded" />
                <span className="text-[11px] text-foreground-600">Featured</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowEditModal(false); setEditForm(null); }} className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                {saving ? <i className="ri-loader-4-line animate-spin mr-1" /> : null}Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discover Modal ── */}
      {showDiscoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowDiscoverModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg text-foreground-900">Discover Local Places</h2>
              <button onClick={() => setShowDiscoverModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            </div>
            <p className="text-xs text-foreground-500 mb-4">Search for nearby hotels, restaurants, transport and attractions around your wedding venue using Google Places.</p>

            {!isDemo && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-label font-semibold text-foreground-500 mb-1">Category</label>
                    <select value={discoveryCategory} onChange={(e) => setDiscoveryCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 cursor-pointer">
                      <option value="">All categories</option>
                      {TRAVEL_CATEGORIES.map((c) => <option key={c.key} value={c.placeType}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-label font-semibold text-foreground-500 mb-1">Radius (miles)</label>
                    <select value={discoveryRadius} onChange={(e) => setDiscoveryRadius(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 cursor-pointer">
                      {[1, 2, 3, 5, 10, 15, 20].map((r) => <option key={r} value={r}>{r} miles</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-label font-semibold text-foreground-500 mb-1">Search keyword</label>
                    <input type="text" value={discoveryQuery} onChange={(e) => setDiscoveryQuery(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400" placeholder="e.g. boutique hotel" />
                  </div>
                </div>
                <button onClick={handleDiscover} disabled={discoveryLoading}
                  className="w-full px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap mb-4">
                  {discoveryLoading ? <i className="ri-loader-4-line animate-spin mr-1.5" /> : <i className="ri-search-line mr-1.5" />}
                  {discoveryLoading ? 'Searching...' : 'Search Nearby Places'}
                </button>
              </>
            )}

            {isDemo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center mb-4">
                <p className="text-xs text-amber-700">Discovery requires connecting to Supabase and configuring a Google Places API key. In demo mode, you can add places manually.</p>
              </div>
            )}

            {discoveryError && (
              <div className="bg-secondary-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-foreground-600">{discoveryError}</p>
                {discoveryError.includes('google_api_not_configured') && (
                  <p className="text-xs text-foreground-500 mt-2">Add the GOOGLE_PLACES_API_KEY secret in Supabase Edge Function settings. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Get a key here</a>.</p>
                )}
              </div>
            )}

            {discoveryResults.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <p className="text-xs text-foreground-500 mb-2">{discoveryResults.length} places found</p>
                {discoveryResults.map((r) => {
                  const isImported = discoveryImporting.includes(r.google_place_id);
                  return (
                    <div key={r.google_place_id} className="flex items-start justify-between gap-3 bg-background-50 rounded-lg p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-label font-semibold text-foreground-900">{r.name}</p>
                        <p className="text-[11px] text-foreground-500 truncate">{r.address_line_1}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {r.provider_rating && <span className="text-[10px] text-amber-600"><i className="ri-star-fill text-[9px]" /> {r.provider_rating}</span>}
                          {r.price_level && <span className="text-[10px] text-foreground-400">{r.price_level}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleImportDiscovered(r)} disabled={isImported}
                        className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0">
                        {isImported ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-add-line text-xs mr-0.5" />}
                        {isImported ? '' : 'Import'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-500 mb-3">
                <i className="ri-delete-bin-line text-xl" />
              </div>
              <h3 className="font-heading text-base text-foreground-900 mb-1">Delete place?</h3>
              <p className="text-xs text-foreground-500">This will permanently remove "{showDeleteConfirm.name}" and guests will no longer see it.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-label font-semibold hover:bg-red-600 cursor-pointer whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-md text-xs font-label ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'info' ? 'bg-foreground-800 text-white' : 'bg-red-600 text-white'}`}>
          <i className={`${toast.type === 'success' ? 'ri-check-line' : toast.type === 'info' ? 'ri-information-line' : 'ri-error-warning-line'} text-sm flex-shrink-0`} />
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
        </div>
      )}
    </AppShell>
  );
}