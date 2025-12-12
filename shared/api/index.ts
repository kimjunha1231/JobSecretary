// Client-safe exports only
export { supabase } from './client';
export { getQueryClient } from './query-client';

// Note: For server-side code, import directly:
// import { createServerSupabaseClient } from '@/shared/api/server';

