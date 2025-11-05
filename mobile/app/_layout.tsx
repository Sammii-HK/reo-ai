import '../global.css'
import 'react-native-gesture-handler'
import { AuthProvider } from '@/lib/auth'
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AuthProvider>
  )
}