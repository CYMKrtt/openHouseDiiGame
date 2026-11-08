import { defineConfig } from '@playwright/test';
import base from './playwright.config';
process.env.NEXT_PUBLIC_SESSION_MODE='server';
export default defineConfig(base, {testMatch:'server-mode.spec.ts'});
