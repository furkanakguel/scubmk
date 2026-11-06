import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['app/**/*.tsx'],
    rules: {
      // This Vinext app deliberately uses document navigation so authentication
      // cookies are re-read and canvas/audio runtimes are fully disposed.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: [
      'app/components/EventCards.tsx',
      'app/etkinlik/[[]id]/page.tsx',
      'app/etkinlikler/page.tsx',
    ],
    rules: {
      // Server-rendered event availability is calculated at request time.
      // These components are not client React Compiler components.
      'react-hooks/purity': 'off',
    },
  },
  globalIgnores([
    'dist/**',
    '.vinext/**',
    '.wrangler/**',
    '.sites-runtime/**',
    'outputs/**',
    'work/**',
  ]),
  {
    files: ['components/ui/**/*.{ts,tsx}', 'hooks/use-mobile.ts'],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
