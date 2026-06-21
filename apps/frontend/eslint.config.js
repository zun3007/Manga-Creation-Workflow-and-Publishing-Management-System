import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Fetch-on-mount loaders (setLoading/setError before awaiting) are the
      // idiom throughout this app and match the React docs data-fetching
      // example. Keep visible as a warning; revisit if we adopt a query lib.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Context-provider modules intentionally export a provider component plus
    // its hook from one file; fast-refresh falls back to a full reload there.
    files: ['src/lib/auth.tsx', 'src/lib/confirm.tsx', 'src/components/ui/Toast.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
