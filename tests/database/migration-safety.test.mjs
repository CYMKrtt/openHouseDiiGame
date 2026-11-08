import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const base={...process.env,SUPABASE_URL:'https://alpha.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://alpha.supabase.co',M3_TEST_DISPOSABLE_DATABASE:'yes'};
for(const [name,url] of [
 ['mismatched project','postgresql://postgres.beta:placeholder@aws-0-test.pooler.supabase.com:5432/postgres'],
 ['transaction pooler','postgresql://postgres.alpha:placeholder@aws-0-test.pooler.supabase.com:6543/postgres'],
]) test(`migration runner rejects ${name} without exposing credentials`,()=>{
 const run=spawnSync(process.execPath,['scripts/m3-migrate.mjs'],{env:{...base,M3_TEST_DATABASE_URL:url},encoding:'utf8'});
 assert.equal(run.status,1);assert.match(run.stderr,/checking the development configuration/);assert.doesNotMatch(run.stderr,/placeholder|postgresql:\/\//);
});
