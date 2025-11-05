import { Tabs } from 'expo-router'
import { useAuth } from '@/lib/auth'

export default function AppLayout() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="domains"
        options={{
          title: 'Categories',
          tabBarLabel: 'Categories',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="domains/[domainId]"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  )
}