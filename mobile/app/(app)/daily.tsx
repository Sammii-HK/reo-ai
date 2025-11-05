import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native'
import { apiClient } from '@/lib/api'
import { router } from 'expo-router'

interface Domain {
  id: string
  name: string
  type: 'PRESET' | 'CUSTOM'
  enabled: boolean
  schema: any
}

interface QuickInput {
  domain: string
  domainId: string
  type: string
  fields: Array<{ id: string; name: string; type: string; options?: string[] }>
}

export default function DailyScreen() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [inputs, setInputs] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    loadDomains()
  }, [])

  const loadDomains = async () => {
    try {
      setLoading(true)
      const result = await apiClient.getDomains()
      // Only show enabled domains
      const enabledDomains = (result.domains || []).filter((d: Domain) => d.enabled)
      setDomains(enabledDomains)
    } catch (error: any) {
      console.error('Failed to load domains:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDomains()
  }

  const getQuickInputs = (domain: Domain): QuickInput[] => {
    const schema = domain.schema as any
    const fields = schema?.fields || []
    
    switch (domain.name) {
      case 'WELLNESS':
        return [
          {
            domain: domain.name,
            domainId: domain.id,
            type: 'WATER_LOGGED',
            fields: [
              { id: 'amount', name: 'Amount', type: 'number' },
              { id: 'unit', name: 'Unit', type: 'select', options: ['ml', 'cups', 'oz', 'liters'] },
            ],
          },
          {
            domain: domain.name,
            domainId: domain.id,
            type: 'SLEEP_LOGGED',
            fields: [
              { id: 'hours', name: 'Hours', type: 'number' },
            ],
          },
          {
            domain: domain.name,
            domainId: domain.id,
            type: 'MOOD_LOGGED',
            fields: [
              { id: 'mood', name: 'Mood', type: 'select', options: ['happy', 'sad', 'anxious', 'calm', 'energetic', 'tired'] },
            ],
          },
        ]
      case 'WORKOUT':
        return [
          {
            domain: domain.name,
            domainId: domain.id,
            type: 'SET_COMPLETED',
            fields: [
              { id: 'exercise', name: 'Exercise', type: 'text' },
              { id: 'weight', name: 'Weight (kg)', type: 'number' },
              { id: 'reps', name: 'Reps', type: 'number' },
            ],
          },
        ]
      case 'JOBS':
        return [
          {
            domain: domain.name,
            domainId: domain.id,
            type: 'JOB_APPLIED',
            fields: [
              { id: 'company', name: 'Company', type: 'text' },
              { id: 'role', name: 'Role', type: 'text' },
              { id: 'stage', name: 'Stage', type: 'select', options: ['INTERESTED', 'APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED'] },
            ],
          },
        ]
      default:
        // Generic input based on schema
        return [
          {
            domain: domain.name,
            domainId: domain.id,
            type: 'LOG',
            fields: fields.slice(0, 5), // Limit to first 5 fields for quick input
          },
        ]
    }
  }

  const handleInputChange = (quickInput: QuickInput, fieldId: string, value: any) => {
    const key = `${quickInput.domainId}-${quickInput.type}-${fieldId}`
    setInputs(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (quickInput: QuickInput) => {
    try {
      setSubmitting(quickInput.domainId)
      
      // Build payload from inputs
      const payload: Record<string, any> = {}
      quickInput.fields.forEach(field => {
        const key = `${quickInput.domainId}-${quickInput.type}-${field.id}`
        const value = inputs[key]
        if (value !== undefined && value !== '') {
          // Convert number strings to numbers
          payload[field.id] = field.type === 'number' ? parseFloat(value) || value : value
        }
      })

      // Convert to natural language for NLU
      const text = buildNaturalLanguage(quickInput, payload)
      
      if (!text || text.trim() === '') {
        alert('Please fill in at least one field')
        return
      }
      
      await apiClient.ingest(text, 'CHAT')
      
      // Clear inputs for this quick input
      quickInput.fields.forEach(field => {
        const key = `${quickInput.domainId}-${quickInput.type}-${field.id}`
        delete inputs[key]
      })
      setInputs(prev => {
        const newInputs = { ...prev }
        Object.keys(newInputs).forEach(key => {
          if (key.startsWith(`${quickInput.domainId}-${quickInput.type}-`)) {
            delete newInputs[key]
          }
        })
        return newInputs
      })
      
      // Refresh to show new data
      await loadDomains()
    } catch (error: any) {
      console.error('Failed to submit:', error)
      alert(`Failed to log: ${error.message}`)
    } finally {
      setSubmitting(null)
    }
  }

  const buildNaturalLanguage = (quickInput: QuickInput, payload: Record<string, any>): string => {
    switch (quickInput.type) {
      case 'WATER_LOGGED':
        if (!payload.amount) return ''
        return `drank ${payload.amount} ${payload.unit || 'ml'} of water`
      case 'SLEEP_LOGGED':
        if (!payload.hours) return ''
        return `slept ${payload.hours} hours`
      case 'MOOD_LOGGED':
        if (!payload.mood) return ''
        return `feeling ${payload.mood}`
      case 'SET_COMPLETED':
        if (!payload.exercise) return ''
        const parts = [`${payload.exercise}`]
        if (payload.reps) parts.push(`${payload.reps} reps`)
        if (payload.weight) parts.push(`at ${payload.weight}kg`)
        return `did ${parts.join(' ')}`
      case 'JOB_APPLIED':
        if (!payload.company) return ''
        return `applied to ${payload.company}${payload.role ? ` for ${payload.role} role` : ''}`
      default:
        // Generic: build from payload
        const entries = Object.entries(payload).filter(([_, v]) => v !== '' && v !== undefined)
        if (entries.length === 0) return ''
        return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading daily tracker...</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Daily Log</Text>
        <Text style={styles.subtitle}>
          Quick input for all your trackers
        </Text>
      </View>

      {domains.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No categories enabled</Text>
          <Text style={styles.emptySubtext}>
            Enable categories in the Categories tab to start tracking.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {domains.map(domain => {
            const quickInputs = getQuickInputs(domain)
            if (quickInputs.length === 0) return null

            return (
              <View key={domain.id} style={styles.domainSection}>
                <Text style={styles.domainTitle}>{domain.name}</Text>
                
                {quickInputs.map((quickInput, idx) => (
                  <View key={idx} style={styles.inputCard}>
                    <Text style={styles.inputCardTitle}>
                      {quickInput.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    
                    {quickInput.fields.map(field => {
                      const key = `${quickInput.domainId}-${quickInput.type}-${field.id}`
                      const value = inputs[key] || ''
                      
                      return (
                        <View key={field.id} style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>{field.name}</Text>
                          
                          {field.type === 'select' && field.options ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
                              {field.options.map(option => (
                                <TouchableOpacity
                                  key={option}
                                  style={[
                                    styles.optionButton,
                                    value === option && styles.optionButtonActive,
                                  ]}
                                  onPress={() => handleInputChange(quickInput, field.id, option)}
                                >
                                  <Text style={[
                                    styles.optionButtonText,
                                    value === option && styles.optionButtonTextActive,
                                  ]}>
                                    {option}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          ) : (
                            <TextInput
                              style={styles.input}
                              value={value}
                              onChangeText={(text) => handleInputChange(quickInput, field.id, text)}
                              placeholder={`Enter ${field.name.toLowerCase()}`}
                              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                            />
                          )}
                        </View>
                      )
                    })}
                    
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        submitting === quickInput.domainId && styles.submitButtonDisabled,
                      ]}
                      onPress={() => handleSubmit(quickInput)}
                      disabled={submitting === quickInput.domainId}
                    >
                      {submitting === quickInput.domainId ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Log</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          })}
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              💡 Tip: Use the Chat tab for natural language input like "drank 500ml water"
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  domainSection: {
    marginBottom: 24,
  },
  domainTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  optionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
})
