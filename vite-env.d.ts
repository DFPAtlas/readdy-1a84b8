/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_RELEASE_VERSION?: string;
  readonly VITE_BUILD_TIMESTAMP?: string;
  readonly VERCEL_ENV?: string;
  readonly CONTEXT?: string;
  readonly NODE_ENV?: string;
  readonly VERCEL_GIT_COMMIT_REF?: string;
  readonly GITHUB_HEAD_REF?: string;
  readonly CI?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_PUBLIC_SUPABASE_URL?: string;
  readonly VITE_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly VITE_PUBLIC_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta { readonly env: ImportMetaEnv; }

declare const __BASE_PATH__: string;
declare const __IS_PREVIEW__: boolean;
