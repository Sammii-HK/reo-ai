/// <reference types="nativewind/types" />

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useAuth } from '@/lib/auth'
import { router } from 'expo-router'

export default function SignUpScreen() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      Alert.alert('Success', 'Account created! Please check your email to verify your account.')
      router.replace('/(auth)/signin')
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-5 bg-white">
      <Text className="text-3xl font-bold mb-2 text-center">Create Account</Text>
      <Text className="text-base text-gray-600 mb-8 text-center">Join Reo and start tracking your life</Text>

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
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? 'Creating account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.back()}
      >
        <Text className="text-blue-500 text-sm">
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </View>
  )
}