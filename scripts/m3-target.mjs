/** Validate that both Supabase URLs and the PostgreSQL connection target the same project.
 * This does not prove disposability; an explicit owner confirmation is still required. */
export function isMatchingProject(apiValue, publicValue, databaseValue) {
 try {
  const api=new URL(apiValue), publicApi=new URL(publicValue), db=new URL(databaseValue);
  const project=api.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1];
  const username=decodeURIComponent(db.username);
  const direct=project && db.hostname===`db.${project}.supabase.co` && (db.port==='' || db.port==='5432');
  const pooler=project && db.hostname.endsWith('.pooler.supabase.com') && username.endsWith(`.${project}`) && (db.port==='' || db.port==='5432');
  return api.protocol==='https:' && publicApi.origin===api.origin && ['postgres:','postgresql:'].includes(db.protocol) && Boolean(direct||pooler);
 } catch {return false}
}
