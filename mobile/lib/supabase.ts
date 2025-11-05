import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Get env vars from process.env (from .env file)
// Clean up any quotes, trailing % characters, and whitespace
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/^["'\s]+|["'\s%]+$/g, '').trim()
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.replace(/^["'\s]+|["'\s%]+$/g, '').trim()

// Debug logging
console.log('🔍 Supabase Config Check:', {
  rawUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  rawKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...',
  cleanedUrl: supabaseUrl,
  cleanedKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'missing',
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length,
})

if (!supabaseUrl || !supabaseAnonKey) {
  const error = `Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`
  console.error(error)
  throw new Error(error)
}

// Storage adapter - use localStorage on web, SecureStore on native
let storageAdapter: any

if (Platform.OS === 'web') {
  // Web: Use localStorage
  storageAdapter = {
    getItem: (key: string) => {
      if (typeof window !== 'undefined') {
        return Promise.resolve(window.localStorage.getItem(key))
      }
      return Promise.resolve(null)
    },
    setItem: (key: string, value: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value)
      }
      return Promise.resolve()
    },
    removeItem: (key: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
      return Promise.resolve()
    },
  }
} else {
  // Native: Dynamically import SecureStore only on native
  const SecureStore = require('expo-secure-store')
  storageAdapter = {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  }
}

// Create Supabase client with explicit headers
// Supabase requires both 'apikey' header and 'Authorization' header with 'Bearer <key>'
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${supabaseAnonKey!}`,
    },
  },
})