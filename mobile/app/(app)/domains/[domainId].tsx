import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { apiClient } from '@/lib/api'
import DomainTable from '@/components/DomainTable'

export default function DomainViewScreen() {
  const { domainId } = useLocalSearchParams<{ domainId: string }>()
  const [domainData, setDomainData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
      setRefreshing(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDomainData()
  }

  const handleRowPress = (row: any) => {
    // TODO: Open edit modal or detail view
    console.log('Row pressed:', row)
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

  // Get schema from domain or use default
  const schema = (domain.schema as any) || { fields: [] }
  
  // Filter out bad data entries
  const filteredData = allData.filter(item => {
    if (domain.name === 'JOBS') {
      const company = item.company || item.payload?.company || ''
      const role = item.role || item.payload?.role || item.payload?.position || ''
      // Filter out incomplete/bad entries
      if (
        company === 'Unknown' || 
        company === 'To be determined' ||
        role === 'i want to apply' ||
        role === 'Unknown' ||
        role === 'To be determined'
      ) {
        return false
      }
    }
    return true
  })

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{domain.name}</Text>
          <Text style={styles.subtitle}>
            {domain.type === 'PRESET' ? 'Template' : 'Custom Category'} • {filteredData.length} entries
            {!domain.enabled && (
              <Text style={styles.disabledBadge}> • Disabled</Text>
            )}
          </Text>
          {!domain.enabled && (
            <View style={styles.disabledBanner}>
              <Text style={styles.disabledBannerText}>
                This category is disabled. Enable it in Categories to show it on the Daily page.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tableWrapper}>
          <DomainTable
            data={filteredData}
            schema={schema}
            domainName={domain.name}
            onRowPress={handleRowPress}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
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
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerTop: {
    marginBottom: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  tableWrapper: {
    flex: 1,
    minHeight: 400,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
  disabledBadge: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  disabledBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  disabledBannerText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
})

