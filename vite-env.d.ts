interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_PUBLIC_SUPABASE_URL?: string;
  readonly VITE_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly VITE_PUBLIC_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}