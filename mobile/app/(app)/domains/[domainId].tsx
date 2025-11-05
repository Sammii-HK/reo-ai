import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { apiClient } from '@/lib/api'

export default function DomainViewScreen() {
  const { domainId } = useLocalSearchParams<{ domainId: string }>()
  const [domainData, setDomainData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (domainId) {
      loadDomainData()
    }
  }, [domainId])

  const loadDomainData = async () => {
    try {
      setLoading(true)
      const result = await apiClient.getDomainData(domainId!)
      setDomainData(result)
    } catch (error: any) {
      console.error('Failed to load domain data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatLogData = (log: any, domainName: string) => {
    switch (domainName) {
      case 'WELLNESS':
        return `${log.kind}: ${log.value || ''} ${log.unit || ''}`
      case 'WORKOUT':
        return `${log.exercise}: ${log.reps} reps @ ${log.weightKg}kg`
      case 'HABIT':
        return log.meta?.habit || 'Habit completed'
      case 'JOBS':
        return `${log.company} - ${log.position} (${log.status})`
      case 'FINANCES':
        return `${log.type}: ${log.amount} (${log.category || 'Uncategorized'})`
      case 'LEARNING':
        return `${log.type}: ${log.title} (${log.progress || 0}%)`
      case 'PRODUCTIVITY':
        return `${log.type}: ${log.duration || 'N/A'} min`
      case 'HEALTH':
        return `${log.type}: ${log.value || ''} ${log.unit || ''}`
      case 'SOBRIETY':
        return `${log.status} (${log.substance || 'N/A'})`
      case 'ROUTINE':
        return `${log.routineId}: ${log.status}`
      default:
        return JSON.stringify(log)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading domain data...</Text>
      </View>
    )
  }

  if (!domainData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load domain data</Text>
      </View>
    )
  }

  const { domain, events, logs } = domainData
  const allData = [...(logs || []), ...(events || [])].sort((a, b) => {
    const dateA = new Date(a.ts || a.createdAt || 0)
    const dateB = new Date(b.ts || b.createdAt || 0)
    return dateB.getTime() - dateA.getTime()
  })

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{domain.name}</Text>
        <Text style={styles.subtitle}>
          {domain.type === 'PRESET' ? 'Preset Category' : 'Custom Category'}
        </Text>
      </View>

      {allData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data yet</Text>
          <Text style={styles.emptySubtext}>
            Start tracking by saying something in the Chat tab.
          </Text>
        </View>
      ) : (
        <View style={styles.dataList}>
          {allData.map((item: any, index: number) => (
            <View key={item.id || index} style={styles.dataCard}>
              <Text style={styles.dataText}>
                {formatLogData(item, domain.name)}
              </Text>
              <Text style={styles.dataDate}>
                {formatDate(item.ts || item.createdAt)}
              </Text>
              {item.notes && (
                <Text style={styles.dataNotes}>{item.notes}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  dataList: {
    padding: 16,
  },
  dataCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  dataDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  dataNotes: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
})

