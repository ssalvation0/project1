import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kezdcaxjqwxvisqqmoik.supabase.co';
const supabaseAnonKey = 'sb_publishable_slk8NSvqZEPkiLctMkFUMw_aMJzjVZF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
