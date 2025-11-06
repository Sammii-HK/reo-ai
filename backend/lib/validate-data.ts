// Data validation utilities to prevent bad data from entering database

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/
const NUMERIC_ID_PATTERN = /^\d{10,}$/
const URL_PATTERN = /^https?:\/\//

const BAD_VALUES = ['Unknown', 'To be determined', 'TBD', 'N/A', 'null', 'undefined', '']

export function isValidHabitName(habit: string): boolean {
  if (!habit || typeof habit !== 'string') return false
  
  const trimmed = habit.trim()
  
  // Check length
  if (trimmed.length < 2 || trimmed.length > 50) return false
  
  // Check for bad values
  if (BAD_VALUES.includes(trimmed)) return false
  
  // Check for timestamp
  if (TIMESTAMP_PATTERN.test(trimmed)) return false
  
  // Check for date
  if (DATE_PATTERN.test(trimmed)) return false
  
  // Check for numeric ID
  if (NUMERIC_ID_PATTERN.test(trimmed)) return false
  
  // Check for URL
  if (URL_PATTERN.test(trimmed)) return false
  
  // Must contain letters
  if (!/[a-zA-Z]/.test(trimmed)) return false
  
  return true
}

export function isValidCompanyName(company: string): boolean {
  if (!company || typeof company !== 'string') return false
  
  const trimmed = company.trim()
  
  // Check for bad values
  if (BAD_VALUES.includes(trimmed)) return false
  
  // Check for timestamp
  if (TIMESTAMP_PATTERN.test(trimmed)) return false
  
  // Check for date
  if (DATE_PATTERN.test(trimmed)) return false
  
  // Must have reasonable length
  if (trimmed.length < 1 || trimmed.length > 100) return false
  
  return true
}

export function isValidRoleName(role: string): boolean {
  if (!role || typeof role !== 'string') return false
  
  const trimmed = role.trim()
  
  // Check for bad values
  if (BAD_VALUES.includes(trimmed)) return false
  
  // Check for timestamp
  if (TIMESTAMP_PATTERN.test(trimmed)) return false
  
  // Check for date
  if (DATE_PATTERN.test(trimmed)) return false
  
  // Check for raw input phrases
  const rawInputPhrases = [
    'i want to apply',
    'i want to',
    'i am trying to',
    'help me',
  ]
  if (rawInputPhrases.some(phrase => trimmed.toLowerCase().includes(phrase))) {
    return false
  }
  
  // Must have reasonable length
  if (trimmed.length < 1 || trimmed.length > 100) return false
  
  return true
}

export function validateHabitEvent(payload: any): { valid: boolean; error?: string } {
  const habit = payload.habit
  
  if (!habit) {
    return { valid: false, error: 'Habit name is required' }
  }
  
  if (!isValidHabitName(habit)) {
    return { 
      valid: false, 
      error: `Invalid habit name: "${habit}". Habit names must be descriptive text (e.g., "quit smoking", "drink water"), not timestamps, dates, or placeholders.` 
    }
  }
  
  return { valid: true }
}

export function validateJobEvent(payload: any): { valid: boolean; error?: string } {
  const company = payload.company
  const role = payload.role || payload.position
  
  if (!company || !isValidCompanyName(company)) {
    return { 
      valid: false, 
      error: `Invalid company: "${company}". Company must be a valid name, not "Unknown", timestamp, or placeholder.` 
    }
  }
  
  if (!role || !isValidRoleName(role)) {
    return { 
      valid: false, 
      error: `Invalid role: "${role}". Role must be a valid job title, not "Unknown", timestamp, date, or raw input.` 
    }
  }
  
  return { valid: true }
}

export function validateEvent(event: { domain: string; type: string; payload: any }): { valid: boolean; error?: string } {
  switch (event.domain) {
    case 'HABIT':
      if (event.type === 'HABIT_COMPLETED') {
        return validateHabitEvent(event.payload)
      }
      break
    case 'JOBS':
      if (event.type === 'JOB_APPLIED' || event.type === 'JOB_INTERVIEW' || event.type === 'JOB_OFFER') {
        return validateJobEvent(event.payload)
      }
      break
  }
  
  return { valid: true }
}

