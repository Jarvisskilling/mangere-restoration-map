import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Module-level singleton — avoids @supabase/ssr cookie-handling issues in client components
let _client: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}
