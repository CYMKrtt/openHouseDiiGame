import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals, ...nextTs, globalIgnores(['.next/**', '.next-test/**', '.next-check/**', '.next-host-check/**', '.next-m4/**', 'node_modules/**', 'reference/**', 'next-env.d.ts'])]);
