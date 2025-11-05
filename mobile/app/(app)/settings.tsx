/// <reference types="nativewind/types" />

import React from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { useAuth } from '@/lib/auth'
import { router } from 'expo-router'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/signin')
          },
        },
      ]
    )
  }

  return (
    <View className="flex-1 p-5 bg-white">
      <Text className="text-3xl font-bold mb-8">Settings</Text>
      
      <View className="mb-6">
        <Text className="text-sm text-gray-600 mb-1">Email</Text>
        <Text className="text-base text-black">{user?.email}</Text>
      </View>

      <TouchableOpacity className="bg-red-500 rounded-lg p-4 items-center mt-8" onPress={handleSignOut}>
        <Text className="text-white text-base font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}