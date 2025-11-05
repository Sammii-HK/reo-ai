import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { apiClient } from '@/lib/api'

interface Domain {
  id: string
  name: string
  type: 'PRESET' | 'CUSTOM'
  enabled: boolean
  order: number
  icon?: string
  color?: string
}

export default function DomainsScreen() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDomains()
  }, [])

  const loadDomains = async () => {
    try {
      setLoading(true)
      console.log('📊 Loading domains...')
      const result = await apiClient.getDomains()
      console.log('📊 Domains result:', result)
      
      if (!result.domains || result.domains.length === 0) {
        console.log('📊 No domains found, ensuring they exist...')
        // Ensure domains exist for this user
        try {
          await apiClient.ensureDomains()
          const retryResult = await apiClient.getDomains()
          console.log('📊 Domains after ensure:', retryResult)
          setDomains(retryResult.domains || [])
        } catch (ensureError: any) {
          console.error('Failed to ensure domains:', ensureError)
          // Still set empty array so UI shows empty state
          setDomains([])
        }
      } else {
        setDomains(result.domains)
      }
    } catch (error: any) {
      console.error('❌ Failed to load domains:', error)
      console.error('Error details:', {
        message: error.message,
        name: error.name,
      })
      // Set empty array on error so UI can show error state
      setDomains([])
    } finally {
      setLoading(false)
    }
  }

  const getDomainIcon = (domain: Domain) => {
    if (domain.icon) return domain.icon
    
    const iconMap: Record<string, string> = {
      WELLNESS: '💧',
      WORKOUT: '💪',
      HABIT: '✅',
      JOBS: '💼',
      FINANCES: '💰',
      LEARNING: '📚',
      PRODUCTIVITY: '🎯',
      HEALTH: '🏥',
      SOBRIETY: '🌱',
      ROUTINE: '🔄',
    }
    
    return iconMap[domain.name] || '📊'
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>
          Track different areas of your life
        </Text>
      </View>

      {domains.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No categories yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the button below to create your preset categories, or start tracking by saying something in the Chat tab.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={async () => {
              try {
                await apiClient.ensureDomains()
                loadDomains()
              } catch (error: any) {
                console.error('Failed to create domains:', error)
              }
            }}
          >
            <Text style={styles.createButtonText}>Create Categories</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.domainsList}>
          {domains.map((domain) => (
            <TouchableOpacity
              key={domain.id}
              style={[
                styles.domainCard,
                !domain.enabled && styles.domainCardDisabled,
              ]}
              onPress={() => router.push(`/(app)/domains/${domain.id}`)}
            >
              <View style={styles.domainIcon}>
                <Text style={styles.iconText}>{getDomainIcon(domain)}</Text>
              </View>
              <View style={styles.domainContent}>
                <Text style={styles.domainName}>{domain.name}</Text>
                <Text style={styles.domainType}>
                  {domain.type === 'PRESET' ? 'Template' : 'Custom'}
                </Text>
              </View>
              <View style={styles.domainToggle}>
                <View
                  style={[
                    styles.toggleCircle,
                    domain.enabled && styles.toggleCircleActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))}
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
    paddingBottom: 16,
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
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  domainsList: {
    padding: 16,
  },
  domainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  domainCardDisabled: {
    opacity: 0.6,
  },
  domainIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  domainContent: {
    flex: 1,
  },
  domainName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  domainType: {
    fontSize: 14,
    color: '#6b7280',
  },
  domainToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
  },
})
