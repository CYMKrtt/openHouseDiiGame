import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isMatchingProject} from '../../scripts/m3-target.mjs';
const api='https://alpha.supabase.co';
test('test database target must match app project and use a session-capable connection',()=>{
 assert.equal(isMatchingProject(api,api,'postgresql://postgres:placeholder@db.alpha.supabase.co:5432/postgres'),true);
 assert.equal(isMatchingProject(api,api,'postgresql://postgres.alpha:placeholder@aws-0-test.pooler.supabase.com:5432/postgres'),true);
 for(const url of ['postgresql://postgres.beta:placeholder@aws-0-test.pooler.supabase.com:5432/postgres','postgresql://postgres.alpha:placeholder@aws-0-test.pooler.supabase.com:6543/postgres','postgresql://postgres:placeholder@db.beta.supabase.co:5432/postgres'])assert.equal(isMatchingProject(api,api,url),false);
 assert.equal(isMatchingProject(api,'https://beta.supabase.co','postgresql://postgres:placeholder@db.alpha.supabase.co:5432/postgres'),false);
});
