/// <reference types="nativewind/types" />

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useAuth } from '@/lib/auth'
import { router } from 'expo-router'

export default function SignInScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      router.replace('/(app)')
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-5 bg-white">
      <Text className="text-3xl font-bold mb-2 text-center">Welcome to Reo</Text>
      <Text className="text-base text-gray-600 mb-8 text-center">Sign in to continue</Text>

      <TextInput
        className="border border-gray-300 rounded-lg p-4 text-base mb-4 bg-gray-50"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        className="border border-gray-300 rounded-lg p-4 text-base mb-4 bg-gray-50"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        className={`bg-blue-500 rounded-lg p-4 items-center mt-2 ${loading ? 'opacity-60' : ''}`}
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.push('/(auth)/signup')}
      >
        <Text className="text-blue-500 text-sm">
          Don't have an account? Sign up
        </Text>
      </TouchableOpacity>
    </View>
  )
}