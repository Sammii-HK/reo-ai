import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { router } from 'expo-router'

// Simple gradient component fallback
const GradientHeader = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: '#667eea', paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20 }}>
    {children}
  </View>
)

export default function HomeScreen() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<string>('')
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [summaryResult, metricsResult] = await Promise.all([
        apiClient.getSummary('daily').catch(() => ({ summary: 'No activity yet today.' })),
        apiClient.getMetrics().catch(() => ({ metrics: [] })),
      ])
      setSummary(summaryResult.summary || 'No activity yet today.')
      setMetrics(metricsResult.metrics || [])
      
      // Check if first visit
      if (!summaryResult.summary || summaryResult.summary.includes('No activity')) {
        setIsFirstVisit(true)
      }
    } catch (error: any) {
      console.error('Failed to load data:', error)
      setSummary('Welcome! Start tracking your life through conversation.')
      setIsFirstVisit(true)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const formatMetric = (metric: any) => {
    const value = metric.value?.toFixed?.(1) || metric.value
    const unit = metric.unit || ''
    return `${value}${unit ? ` ${unit}` : ''}`
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <GradientHeader>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'there'}</Text>
        </View>
      </GradientHeader>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : isFirstVisit ? (
        <View style={styles.onboardingContainer}>
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingEmoji}>✨</Text>
            <Text style={styles.onboardingTitle}>Welcome to Reo</Text>
            <Text style={styles.onboardingText}>
              Track your life through natural conversation. Just tell me what you've been up to.
            </Text>
            
            <View style={styles.quickStartSection}>
              <Text style={styles.quickStartTitle}>Try saying:</Text>
              <View style={styles.exampleCard}>
                <Text style={styles.exampleText}>💧 "drank 2 cups of water"</Text>
              </View>
              <View style={styles.exampleCard}>
                <Text style={styles.exampleText}>💪 "did 5 squats at 100kg"</Text>
              </View>
              <View style={styles.exampleCard}>
                <Text style={styles.exampleText}>😊 "feeling happy today"</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(app)/chat')}
            >
              <Text style={styles.ctaButtonText}>Start Chatting →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(app)/domains')}
            >
              <Text style={styles.secondaryButtonText}>View Categories</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.content}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Today's Summary</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>

            {metrics.length > 0 && (
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Quick Stats</Text>
                {metrics.map((metric, index) => (
                  <View key={index} style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricValue}>{formatMetric(metric)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(app)/chat')}
              >
                <Text style={styles.actionButtonText}>💬 Start Chatting</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => router.push('/(app)/domains')}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                  📊 View Categories
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  gradientHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  content: {
    paddingTop: 20,
  },
  onboardingContainer: {
    padding: 20,
    paddingTop: 30,
  },
  onboardingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  onboardingEmoji: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 16,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  onboardingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  quickStartSection: {
    marginBottom: 32,
  },
  quickStartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  exampleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  exampleText: {
    fontSize: 16,
    color: '#333',
  },
  ctaButton: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  metricsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  metricCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 16,
    color: '#4b5563',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionButton: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#667eea',
  },
})
