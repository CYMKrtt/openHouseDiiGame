import 'server-only';
import { createClient } from '@supabase/supabase-js';
export function db() {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error('M3_DATABASE_NOT_CONFIGURED');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export async function rpc<T>(name:string, args:Record<string,unknown>={}) {
  const { data,error } = await db().rpc(name,args);
  if(error) throw new Error(error.message);
  return data as T;
}
