import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('preflight refuses a mismatched target without printing credentials',()=>{
 const env={...process.env,SUPABASE_URL:'https://alpha.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://alpha.supabase.co',M3_TEST_DATABASE_URL:'postgresql://postgres.beta:placeholder@aws-0-test.pooler.supabase.com:5432/postgres',M3_TEST_DISPOSABLE_DATABASE:'yes'};
 const run=spawnSync(process.execPath,['scripts/m3-preflight.mjs'],{env,encoding:'utf8'});
 assert.equal(run.status,1);assert.match(run.stderr,/checking the development configuration/);assert.doesNotMatch(run.stderr,/placeholder|postgresql:\/\//);
});
