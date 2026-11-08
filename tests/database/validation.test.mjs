import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDisplayName} from '../../src/server/validation.ts';
test('server name validation counts graphemes and rejects invisible and bidi-only names',()=>{
 assert.equal(normalizeDisplayName('  สวัสดี  '),'สวัสดี');
 assert.equal(normalizeDisplayName('👨‍👩‍👧‍👦'),'👨‍👩‍👧‍👦');
 assert.equal(normalizeDisplayName('ก'.repeat(30)),'ก'.repeat(30));
 for(const value of ['', '  ', '\u200b', '\u202eA', 'ก'.repeat(31)])assert.equal(normalizeDisplayName(value),null);
});
