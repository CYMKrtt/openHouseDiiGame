import { existsSync } from 'node:fs';
import {test,expect} from '@playwright/test';
test('cross-origin mutations are rejected before accessing the database',async({request})=>{
 const response=await request.post('/api/v1/join',{headers:{Origin:'https://untrusted.example'},data:{displayName:'Test'}});expect(response.status()).toBe(403);expect(await response.json()).toEqual({code:'ORIGIN_REJECTED'});
});
test('missing development database fails closed without exposing secrets',async({request})=>{
 test.skip(!!process.env.SUPABASE_URL || existsSync('.env.local'),'Requires missing development configuration');
 const response=await request.get('/api/v1/bootstrap');expect(response.status()).toBe(503);expect(await response.json()).toEqual({code:'SERVICE_UNAVAILABLE'});expect(response.headers()['set-cookie']).toBeUndefined();
});

test('anonymous callers cannot read Host roster or player identity',async({request})=>{
 const host=await request.get('/api/v1/host/session');expect(host.status()).toBe(401);expect(await host.json()).toEqual({code:'HOST_AUTH_REQUIRED'});
 const own=await request.get('/api/v1/me');expect(own.status()).toBe(401);expect(await own.json()).toEqual({code:'PLAYER_REQUIRED'});
});

test('oversized request bodies are rejected',async({request})=>{
 const res=await request.post('/api/v1/join',{headers:{Origin:'http://127.0.0.1:3100'},data:{displayName:'x'.repeat(5000)}});expect(res.status()).toBe(422);expect(await res.json()).toEqual({code:'INVALID_INPUT'});
});
