import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Clipboard } from 'react-native'

interface Field {
  id: string
  name: string
  type: 'text' | 'number' | 'select' | 'date' | 'boolean'
  required?: boolean
  options?: string[]
}

interface DomainSchema {
  fields: Field[]
  views?: Array<{
    id: string
    name: string
    type: string
    filters?: any[]
    sorts?: any[]
  }>
  display?: {
    defaultView: string
    groupBy?: string | null
  }
}

interface DomainTableProps {
  data: any[]
  schema: DomainSchema
  domainName: string
  onRowPress?: (row: any) => void
}

export default function DomainTable({ data, schema, domainName, onRowPress }: DomainTableProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data yet</Text>
        <Text style={styles.emptySubtext}>
          Start tracking by adding entries in the Chat tab or Daily page.
        </Text>
      </View>
    )
  }

  // Get fields from schema, or use defaults based on domain
  const fields = schema?.fields || getDefaultFields(domainName)
  
  // Transform data to rows based on fields, then filter out bad data
  const rows = data
    .map(item => transformToRow(item, domainName, fields))
    .filter(row => {
      // Filter out rows with "Unknown" company, "To be determined", or bad role text
      if (domainName === 'JOBS') {
        const company = row.company || ''
        const role = row.role || ''
        // Skip if company is unknown/determined or role is just user input text
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
  
  // Get column widths (flexible) - make important columns wider
  const columnWidths = fields.map(field => {
    // Make key fields wider
    if (field.id === 'title' || field.id === 'company' || field.id === 'exercise' || field.id === 'habit') return 1.5
    if (field.id === 'notes' || field.id === 'description') return 2
    return 1
  })

  const formatValue = (value: any, field: Field): string => {
    if (value === null || value === undefined) return '-'
    
    switch (field.type) {
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : new Date(value).toLocaleDateString()
      case 'number':
        return typeof value === 'number' ? value.toString() : String(value)
      case 'boolean':
        return value ? '✓' : ''
      default:
        return String(value)
    }
  }

  // Include date column in fields for display
  const allFields = [...fields, { id: 'date', name: 'Date', type: 'date' as const }]
  const allColumnWidths = [...columnWidths, 1]

  return (
    <ScrollView 
      horizontal 
      style={styles.container}
      showsHorizontalScrollIndicator={true}
    >
      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={styles.headerRow}>
          {allFields.map((field, index) => (
            <View 
              key={field.id} 
              style={[
                styles.headerCell, 
                { flex: field.id === 'date' ? 1 : allColumnWidths[index] },
                field.id === 'date' && { width: 120 }
              ]}
            >
              <Text style={styles.headerText}>{field.name}</Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {rows.map((row, rowIndex) => (
          <TouchableOpacity
            key={row.id || rowIndex}
            style={[
              styles.dataRow,
              rowIndex % 2 === 0 && styles.dataRowEven,
            ]}
            onPress={() => onRowPress?.(row)}
            onLongPress={() => {
              // On long press, show options to copy row data
              const rowText = allFields.map(field => {
                const value = formatValue(row[field.id] || row.date, field)
                return `${field.name}: ${value}`
              }).join('\n')
              
              Alert.alert(
                'Copy Row Data',
                'Copy this row to clipboard?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Copy All', 
                    onPress: () => {
                      Clipboard.setString(rowText)
                      Alert.alert('Copied', 'Row data copied to clipboard')
                    }
                  },
                ]
              )
            }}
            activeOpacity={0.7}
          >
            {allFields.map((field, colIndex) => {
              const cellValue = formatValue(row[field.id] || row.date, field)
              return (
                <TouchableOpacity
                  key={field.id}
                  style={[
                    styles.dataCell, 
                    { 
                      flex: field.id === 'date' ? 1 : allColumnWidths[colIndex],
                    },
                    field.id === 'date' && { width: 120 }
                  ]}
                  onLongPress={() => {
                    // Copy individual cell value
                    Clipboard.setString(cellValue)
                    Alert.alert('Copied', `"${cellValue}" copied to clipboard`)
                  }}
                >
                  <Text 
                    style={[
                      styles.dataText,
                      field.id === 'date' && styles.dateText,
                      // Highlight bad data
                      (cellValue === 'Unknown' || cellValue === 'To be determined' || cellValue === 'i want to apply') && styles.badDataText
                    ]} 
                    numberOfLines={field.id === 'date' ? 1 : 2}
                  >
                    {cellValue}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

// Transform log/event data to row format based on schema fields
function transformToRow(item: any, domainName: string, fields: Field[]): any {
  const row: any = { id: item.id }
  
  // Map based on domain-specific structure
  switch (domainName) {
    case 'WELLNESS':
      row.kind = item.kind || item.payload?.kind || '-'
      row.value = item.value || item.payload?.amount || item.payload?.hours || item.payload?.value || '-'
      row.unit = item.unit || item.payload?.unit || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'WORKOUT':
      row.exercise = item.exercise || item.payload?.exercise || '-'
      row.weight = item.weightKg || item.payload?.weight || '-'
      row.reps = item.reps || item.payload?.reps || '-'
      row.rpe = item.rpe || item.payload?.rpe || '-'
      row.date = item.ts || item.createdAt
      break
      
    case 'HABIT':
      row.habit = item.meta?.habit || item.payload?.habit || '-'
      row.value = item.value || item.payload?.value || '-'
      row.unit = item.unit || item.payload?.unit || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'JOBS':
      row.company = item.company || item.payload?.company || '-'
      row.role = item.role || item.payload?.role || item.payload?.position || '-'
      row.stage = item.stage || item.payload?.stage || item.payload?.status || '-'
      row.salary = item.salary || item.payload?.salary || '-'
      row.notes = item.notes || item.payload?.notes || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'FINANCES':
      row.category = item.category || item.payload?.category || '-'
      row.amount = item.amount || item.payload?.amount || '-'
      row.type = item.type || item.payload?.type || '-'
      row.notes = item.notes || item.payload?.notes || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'LEARNING':
      row.type = item.type || item.payload?.type || '-'
      row.title = item.title || item.payload?.title || '-'
      row.progress = item.progress !== undefined ? `${item.progress}%` : item.payload?.progress ? `${item.payload.progress}%` : '-'
      row.notes = item.notes || item.payload?.notes || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'PRODUCTIVITY':
      row.type = item.type || item.payload?.type || '-'
      row.duration = item.duration || item.payload?.duration || '-'
      row.count = item.payload?.count || '-'
      row.notes = item.notes || item.payload?.notes || item.payload?.description || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'HEALTH':
      row.type = item.type || item.payload?.type || '-'
      row.value = item.value || item.payload?.value || '-'
      row.unit = item.unit || item.payload?.unit || '-'
      row.notes = item.notes || item.payload?.notes || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'SOBRIETY':
      row.substance = item.substance || item.payload?.substance || '-'
      row.status = item.status || item.payload?.status || '-'
      row.craving = item.craving || item.payload?.craving || '-'
      row.days = item.payload?.days || '-'
      row.notes = item.notes || item.payload?.notes || ''
      row.date = item.ts || item.createdAt
      break
      
    case 'ROUTINE':
      row.routine = item.routineId || item.payload?.routine || '-'
      row.status = item.status || item.payload?.status || '-'
      row.notes = item.notes || item.payload?.notes || ''
      row.date = item.ts || item.createdAt
      break
      
    default:
      // Generic fallback - use payload or meta
      fields.forEach(field => {
        row[field.id] = item[field.id] || item.payload?.[field.id] || item.meta?.[field.id] || '-'
      })
      row.date = item.ts || item.createdAt || item.createdAt
  }
  
  return row
}

// Get default fields if schema not available
function getDefaultFields(domainName: string): Field[] {
  const defaults: Record<string, Field[]> = {
    WELLNESS: [
      { id: 'kind', name: 'Type', type: 'select' },
      { id: 'value', name: 'Value', type: 'number' },
      { id: 'unit', name: 'Unit', type: 'text' },
    ],
    WORKOUT: [
      { id: 'exercise', name: 'Exercise', type: 'text' },
      { id: 'weight', name: 'Weight (kg)', type: 'number' },
      { id: 'reps', name: 'Reps', type: 'number' },
      { id: 'rpe', name: 'RPE', type: 'number' },
    ],
    HABIT: [
      { id: 'habit', name: 'Habit', type: 'text' },
      { id: 'value', name: 'Value', type: 'number' },
    ],
    JOBS: [
      { id: 'company', name: 'Company', type: 'text' },
      { id: 'role', name: 'Role', type: 'text' },
      { id: 'stage', name: 'Stage', type: 'select' },
      { id: 'salary', name: 'Salary', type: 'number' },
    ],
    FINANCES: [
      { id: 'category', name: 'Category', type: 'text' },
      { id: 'amount', name: 'Amount', type: 'number' },
      { id: 'type', name: 'Type', type: 'select' },
    ],
    LEARNING: [
      { id: 'type', name: 'Type', type: 'select' },
      { id: 'title', name: 'Title', type: 'text' },
      { id: 'progress', name: 'Progress', type: 'number' },
    ],
    PRODUCTIVITY: [
      { id: 'type', name: 'Type', type: 'select' },
      { id: 'duration', name: 'Duration', type: 'number' },
      { id: 'count', name: 'Count', type: 'number' },
    ],
    HEALTH: [
      { id: 'type', name: 'Type', type: 'select' },
      { id: 'value', name: 'Value', type: 'number' },
      { id: 'unit', name: 'Unit', type: 'text' },
    ],
    SOBRIETY: [
      { id: 'substance', name: 'Substance', type: 'text' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'craving', name: 'Craving', type: 'number' },
      { id: 'days', name: 'Days', type: 'number' },
    ],
    ROUTINE: [
      { id: 'routine', name: 'Routine', type: 'text' },
      { id: 'status', name: 'Status', type: 'select' },
    ],
  }
  
  return defaults[domainName] || [
    { id: 'data', name: 'Data', type: 'text' },
  ]
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tableContainer: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    minWidth: 100,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  dataRowEven: {
    backgroundColor: '#fafbfc',
  },
  dataCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    minWidth: 100,
    paddingVertical: 4,
  },
  dataText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  badDataText: {
    color: '#ef4444',
    fontStyle: 'italic',
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
})
