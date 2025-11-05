import { Tabs } from 'expo-router'
import { useAuth } from '@/lib/auth'

export default function AppLayout() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
        }}
      />
      <Tabs.Screen
        name="domains"
        options={{
          title: 'Domains',
          tabBarLabel: 'Track',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tabs>
  )
}