import {createClient} from '@supabase/supabase-js';
export const db=createClient('https://svaozzitkajgqzacldur.supabase.co','sb_publishable_scbeO9M_PR8Zvkh-1nbheA_lZLwl31b',{auth:{storageKey:'family-table-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
export const table=n=>db.from(`family_table_${n}`);
export async function checked(q){const {data,error}=await q;if(error)throw error;return data;}
