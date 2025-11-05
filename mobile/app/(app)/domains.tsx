/// <reference types="nativewind/types" />

import React from 'react'
import { View, Text } from 'react-native'

export default function DomainsScreen() {
  return (
    <View className="flex-1 justify-center items-center px-5 bg-white">
      <Text className="text-3xl font-bold mb-2">Domains</Text>
      <Text className="text-base text-gray-600">
        Track your habits, wellness, workouts, and more...
      </Text>
    </View>
  )
}