/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILDER_DAO_SUBGRAPH_URL?: string;
  readonly VITE_SUBGRAPH_URL?: string;
  readonly VITE_BASE_SEPOLIA_RPC_URL?: string;
  readonly VITE_CDP_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_CDP_API_KEY: string;
  readonly VITE_CDP_API_SECRET: string;
  readonly VITE_BASE_SEPOLIA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
