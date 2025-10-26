// Minimal ambient declarations to satisfy TypeScript in editor for Supabase Edge (Deno) runtime

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// Add global crypto for Web Crypto API
declare const crypto: Crypto

// Global fetch is available in Deno
declare const fetch: typeof globalThis.fetch

// The edge runtime provides standard Web crypto
// The 'crypto' global is already defined in the Edge runtime environment.
// No need to redeclare it here to avoid redeclaration errors.
