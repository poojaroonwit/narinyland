import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
      'scratch/**',
      '*.js',
      '*.cjs',
      '*.mjs',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
];

export default config;
