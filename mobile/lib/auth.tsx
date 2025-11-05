import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { apiClient } from './api'
import { Platform } from 'react-native'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error)
      }
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.access_token) {
        console.log('🔑 Setting access token from session')
        apiClient.setAccessToken(session.access_token)
      } else {
        console.warn('⚠️ No access token in session')
        apiClient.setAccessToken(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.access_token) {
        apiClient.setAccessToken(session.access_token)
        // Storage is handled by Supabase client
      } else {
        apiClient.setAccessToken(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ Sign in error:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
      })
      throw error
    }
    
    console.log('✅ Sign in successful:', data.user?.email)
    if (data.session) {
      console.log('🔑 Session details:', {
        hasAccessToken: !!data.session.access_token,
        tokenLength: data.session.access_token?.length,
        tokenPreview: data.session.access_token ? `${data.session.access_token.substring(0, 20)}...` : 'none',
        expiresAt: data.session.expires_at,
      })
      setSession(data.session)
      setUser(data.user)
      apiClient.setAccessToken(data.session.access_token)
      console.log('✅ Access token set in API client')
    } else {
      console.error('❌ No session in sign in response')
    }
  }

  const signUp = async (email: string, password: string) => {
    console.log('📝 Attempting sign up for:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('❌ Sign up error:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
      })
      throw error
    }
    
    console.log('✅ Sign up successful:', data.user?.email)
    console.log('Session:', data.session ? 'Created' : 'No session (email confirmation required)')
    
    // Note: Supabase may not return a session if email confirmation is required
    if (data.session) {
      setSession(data.session)
      setUser(data.user)
      apiClient.setAccessToken(data.session.access_token)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    apiClient.setAccessToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
