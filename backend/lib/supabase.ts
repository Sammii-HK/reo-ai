import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (uses service role key)
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Client-side Supabase client (for API routes that receive tokens)
export function createApiSupabaseClient(authHeader?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('🔧 Creating Supabase API client:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    url: supabaseUrl?.substring(0, 30) + '...',
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'missing',
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
    throw new Error('Missing Supabase environment variables')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return client
}
