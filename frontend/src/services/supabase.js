import { createClient } from '@supabase/supabase-js';

// Supabase project URL and anon (publishable) key.
//
// The anon key is designed to be exposed to clients — security relies on
// the Row Level Security policies set in the Supabase Dashboard, NOT on
// the key being secret. Still, we read from env so:
//   1. The same code can target different Supabase projects (dev / staging
//      / prod) without source changes
//   2. We can rotate the anon key in the Supabase Dashboard and bump the
//      Vercel env var without committing anything to git
//   3. The public GitHub repo doesn't have to ship the production key
//
// Local dev: put these in `frontend/.env.local` (gitignored).
// Production: set them in Vercel → Project Settings → Environment Variables.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config. Set REACT_APP_SUPABASE_URL and ' +
    'REACT_APP_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
