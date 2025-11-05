/// <reference types="nativewind/types" />

import React from 'react'
import { View, Text } from 'react-native'
import { useAuth } from '@/lib/auth'

export default function HomeScreen() {
  const { user } = useAuth()

  return (
    <View className="flex-1 justify-center items-center px-5 bg-white">
      <Text className="text-3xl font-bold mb-2 text-center">Welcome to Reo</Text>
      <Text className="text-lg text-gray-600 mb-6 text-center">
        Hello, {user?.email}
      </Text>
      <Text className="text-base text-gray-500 text-center leading-6">
        Start tracking your life through conversation. Tap the Chat tab to begin.
      </Text>
    </View>
  )
}