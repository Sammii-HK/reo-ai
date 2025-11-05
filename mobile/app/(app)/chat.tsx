import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiClient } from '@/lib/api'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

const MESSAGES_STORAGE_KEY = '@reo_chat_messages'

const ONBOARDING_MESSAGES = [
  {
    id: '1',
    text: "Hey! I'm Reo, your conversational life tracker. 👋",
    isUser: false,
    timestamp: new Date(),
  },
  {
    id: '2',
    text: "I can help you track all sorts of things - from drinking water and workouts, to habits, finances, learning, and more.",
    isUser: false,
    timestamp: new Date(),
  },
  {
    id: '3',
    text: "Just tell me what you've been up to in natural language. For example:\n• \"drank 2 cups of water\"\n• \"did 5 squats at 100kg\"\n• \"worked on 3 coding projects\"\n• \"read 50 pages\"\n\nWhat would you like to track today?",
    isUser: false,
    timestamp: new Date(),
  },
]

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [hasStarted, setHasStarted] = useState(false)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)

  // Load messages from storage on mount
  useEffect(() => {
    const initializeMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          const loadedMessages = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages)
            setHasStarted(true)
            return
          }
        }
        // No saved messages - show onboarding
        setMessages(ONBOARDING_MESSAGES)
        setHasStarted(true)
      } catch (error) {
        console.error('Failed to load messages:', error)
        // On error, show onboarding
        setMessages(ONBOARDING_MESSAGES)
        setHasStarted(true)
      }
    }
    
    initializeMessages()
  }, [])

  // Save messages to storage whenever they change (but not onboarding messages)
  useEffect(() => {
    if (hasStarted && messages.length > ONBOARDING_MESSAGES.length) {
      saveMessages()
    }
  }, [messages, hasStarted])


  const saveMessages = async () => {
    try {
      // Don't save onboarding messages
      const messagesToSave = messages.filter(msg => !ONBOARDING_MESSAGES.some(om => om.id === msg.id))
      if (messagesToSave.length > 0) {
        await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesToSave))
      }
    } catch (error) {
      console.error('Failed to save messages:', error)
    }
  }

  const handleSend = async () => {
    if (!inputText.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setLoading(true)

    try {
      console.log('📤 Attempting to ingest:', inputText.trim())
      const result = await apiClient.ingest(inputText.trim())
      console.log('✅ Ingest successful:', result)
      
      let responseText = result.response || 'Got it!'
      
      // If there's a suggested category, add a prompt to create it
      if (result.suggestedCategory && !result.parsed) {
        responseText += `\n\nWould you like me to create a "${result.suggestedCategory.name}" category for you? Just say "yes" or "create it".`
      }
      
      // If not parsed, make response more helpful
      if (!result.parsed && !result.suggestedCategory) {
        // Keep the response as-is (it should already have clarifying questions)
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error: any) {
      console.error('❌ Ingest error:', error)
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      })
      
      // More user-friendly error message
      let errorText = error.message || 'Unknown error'
      if (error.message?.includes('Cannot connect')) {
        errorText = 'Cannot connect to server. Please check your internet connection and ensure the backend is running.'
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorText = 'Session expired. Please sign in again.'
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, something went wrong: ${errorText}`,
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  useEffect(() => {
    // Request permissions on mount
    Audio.requestPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Audio recording permission is required for voice input.')
      }
    })

    return () => {
      // Cleanup: stop recording if component unmounts
      if (recording) {
        recording.stopAndUnloadAsync()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      
      setRecording(newRecording)
      setIsRecording(true)
    } catch (error: any) {
      console.error('Failed to start recording:', error)
      Alert.alert('Error', 'Failed to start recording: ' + error.message)
    }
  }

  const stopRecording = async () => {
    if (!recording) return

    try {
      setIsRecording(false)
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      setRecording(null)

      if (!uri) {
        Alert.alert('Error', 'No recording file found')
        return
      }

      // Process the audio
      await handleVoiceInput(uri)
    } catch (error: any) {
      console.error('Failed to stop recording:', error)
      Alert.alert('Error', 'Failed to stop recording: ' + error.message)
      setRecording(null)
      setIsRecording(false)
    }
  }

  const handleVoiceInput = async (audioUri: string) => {
    setLoading(true)

    // Show transcription message
    const transcribingMessage: Message = {
      id: Date.now().toString(),
      text: '🎤 Transcribing...',
      isUser: false,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, transcribingMessage])

    try {
      const result = await apiClient.ingestAudio(audioUri)

      // Remove transcribing message
      setMessages((prev) => prev.filter(msg => msg.id !== transcribingMessage.id))

      // Add user message with transcription
      const userMessage: Message = {
        id: Date.now().toString(),
        text: result.transcription || '[Voice input]',
        isUser: true,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Add bot response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.response || 'Got it!',
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])

      // Clean up audio file
      await FileSystem.deleteAsync(audioUri, { idempotent: true })
    } catch (error: any) {
      // Remove transcribing message
      setMessages((prev) => prev.filter(msg => msg.id !== transcribingMessage.id))

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, voice input failed: ${error.message || 'Unknown error'}`,
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.botMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.botMessageText,
              ]}
            >
              {message.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageContainer, styles.botMessage]}>
            <Text style={[styles.messageText, styles.botMessageText]}>
              Thinking...
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            isRecording && styles.voiceButtonRecording,
            loading && styles.voiceButtonDisabled,
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={loading}
        >
          <Text style={styles.voiceButtonText}>
            {isRecording ? '🎤' : '🎙️'}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type something..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
    padding: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#667eea',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#1f2937',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceButtonRecording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  voiceButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    backgroundColor: '#667eea',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
