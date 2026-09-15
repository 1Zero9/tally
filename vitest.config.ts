import { defineConfig } from 'vitest/config';
import path from 'path';

// Mirrors tsconfig.json's "@/*" -> "./*" path mapping, which Vitest doesn't
// pick up automatically. Without this, any file under test that imports a
// real (non-type-only) dependency via the "@/" alias — e.g. src/lib/auth.ts
// importing "@/src/lib/prisma" — fails to resolve at test time even though
// it builds fine under Next.js.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
