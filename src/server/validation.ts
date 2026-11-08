/** Validate the approved name rule on the server before a database call. */
export function normalizeDisplayName(value:unknown):string|null {
 if(typeof value!=='string')return null;
 const name=value.trim().normalize('NFC');
 if(name.length>1024 || /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(name) || !/[\p{L}\p{N}\p{P}\p{S}]/u.test(name))return null;
 const count=[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(name)].length;
 return count>=1 && count<=30 ? name : null;
}
