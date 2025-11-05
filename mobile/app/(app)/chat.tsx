/// <reference types="nativewind/types" />

import React from 'react'
import { View, Text } from 'react-native'

export default function ChatScreen() {
  return (
    <View className="flex-1 justify-center items-center px-5 bg-white">
      <Text className="text-3xl font-bold mb-2">Chat</Text>
      <Text className="text-base text-gray-600">
        Conversational input coming soon...
      </Text>
    </View>
  )
}