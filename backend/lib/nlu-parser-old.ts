// Natural Language Understanding Parser
// Comprehensive production-ready parser with extensive patterns and LLM fallback

export interface ParsedEvent {
  domain: string
  type: string
  payload: Record<string, any>
  confidence: number
}

// Extract numbers with units
function extractNumber(text: string): { value: number; unit?: string } | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*([a-z]+)?/i)
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2]?.toLowerCase(),
    }
  }
  return null
}

// Extract currency amounts
function extractCurrency(text: string): { amount: number; currency: string } | null {
  const match = text.match(/(?:[\$£€¥]|usd|gbp|eur|jpy)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:dollars?|pounds?|euros?|yen)/i)
  if (match) {
    const amount = parseFloat(match[1] || match[2])
    let currency = 'USD'
    if (text.includes('£') || text.includes('gbp') || text.includes('pound')) currency = 'GBP'
    else if (text.includes('€') || text.includes('eur') || text.includes('euro')) currency = 'EUR'
    else if (text.includes('¥') || text.includes('jpy') || text.includes('yen')) currency = 'JPY'
    return { amount, currency }
  }
  return null
}

// Extract URLs
function extractUrl(text: string): string | undefined {
  const match = text.match(/(https?:\/\/[^\s]+)/i)
  return match ? match[1] : undefined
}

// Extract job details from URL
async function extractJobFromUrl(url: string): Promise<{ company?: string; role?: string }> {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^www\./, '')
    
    // Extract company from hostname (e.g., vercel.com -> Vercel)
    const company = hostname.split('.')[0]
    const companyName = company.charAt(0).toUpperCase() + company.slice(1)
    
    // Extract role from path (e.g., /careers/product-engineer -> "Product Engineer")
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    let role: string | undefined
    
    // Look for common job-related paths
    const careersIndex = pathParts.findIndex(p => p.toLowerCase().includes('career') || p.toLowerCase().includes('job'))
    if (careersIndex >= 0 && pathParts[careersIndex + 1]) {
      role = pathParts[careersIndex + 1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    } else if (pathParts.length > 0) {
      // Try to extract from last path segment
      const lastPart = pathParts[pathParts.length - 1]
      if (lastPart && !lastPart.match(/^\d+$/)) {
        role = lastPart
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
    }
    
    return { company: companyName, role }
  } catch (e) {
    return {}
  }
}

// Extract company/job info from text
function extractJobInfo(text: string): { company?: string; role?: string; url?: string } {
  const url = extractUrl(text)
  
  // Try to extract company name (common patterns)
  const companyMatch = text.match(/(?:at|for|with|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
  const company = companyMatch ? companyMatch[1] : undefined
  
  // Try to extract role/job title
  const roleMatch = text.match(/(?:as|for|position|role|job)\s+(?:a\s+)?([a-z]+(?:\s+[a-z]+){0,3})/i)
  const role = roleMatch ? roleMatch[1] : undefined
  
  return { company, role, url }
}

// Fast heuristic patterns (regex-based) - comprehensive coverage
export function parseWithHeuristics(text: string): ParsedEvent | null {
  const lower = text.toLowerCase().trim()
  const original = text.trim()

  // ===== WELLNESS PATTERNS =====
  
  // Water intake - comprehensive patterns
  const waterPatterns = [
    /(?:drank|drunk|drink|had|consumed|drank|took|downed)\s+(\d+(?:\.\d+)?)\s*(?:glasses?|cups?|liters?|litres?|l|ml|milliliters?|millilitres?|oz|ounces?|fl\s*oz|pints?|quarts?)\s*(?:of\s+)?(?:water|h2o|h₂o)?/i,
    /(\d+(?:\.\d+)?)\s*(?:ml|milliliters?|millilitres?|oz|ounces?|fl\s*oz|cups?|glasses?|liters?|litres?|l|pints?)\s*(?:of\s+)?(?:water|h2o|h₂o)/i,
    /(?:drank|drink|had|consumed)\s+(\d+(?:\.\d+)?)/i, // Simple "drank 500" - assume ml if > 100
  ]
  
  for (const pattern of waterPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const amount = parseFloat(match[1])
      let unit = 'cups' // default
      
      if (lower.match(/ml|milliliter|millilitre/)) unit = 'ml'
      else if (lower.match(/oz|ounce|fl\s*oz/)) unit = 'oz'
      else if (lower.match(/liter|litre|l(?!\w)/)) unit = 'liter'
      else if (lower.match(/cup|glass/)) unit = 'cups'
      else if (lower.match(/pint/)) unit = 'pints'
      else if (lower.match(/quart/)) unit = 'quarts'
      else if (amount > 100 && !lower.match(/(?:cup|glass|liter|litre|oz|ounce|pint|quart)/)) unit = 'ml'
      
      if (amount > 0 && amount < 50000) { // Sanity check
        return {
          domain: 'WELLNESS',
          type: 'WATER_LOGGED',
          payload: { amount, unit },
          confidence: amount > 0 && amount < 10000 ? 0.9 : 0.7,
        }
      }
    }
  }

  // Sleep patterns - comprehensive
  const sleepPatterns = [
    /(?:slept|got|had|rested|got\s+to\s+sleep)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/i,
    /(?:woke\s+up|awake)\s+(?:after|at)\s+(?:(\d+):(\d+)|(\d+(?:\.\d+)?)\s*(?:hours?|hrs?))/i,
    /(?:bedtime|went\s+to\s+bed|sleep|asleep)\s+(?:at\s+)?(\d+):(\d+)/i,
  ]
  
  for (const pattern of sleepPatterns) {
    const match = lower.match(pattern)
    if (match) {
      let hours: number
      if (match[1] && match[2]) {
        // Time format like "slept at 11:30"
        const start = parseInt(match[1])
        const end = parseInt(match[2])
        hours = Math.abs(end - start)
        if (hours > 12) hours = 24 - hours // Handle overnight
      } else {
        hours = parseFloat(match[1] || match[3] || match[4] || '0')
      }
      
      if (hours > 0 && hours < 24) {
        return {
          domain: 'WELLNESS',
          type: 'SLEEP_LOGGED',
          payload: { hours },
          confidence: 0.85,
        }
      }
    }
  }

  // Mood patterns - comprehensive emotional states
  const moodPatterns = [
    /(?:feeling|feel|am|feels|mood\s+is|feeling\s+really|feeling\s+very|feeling\s+pretty)\s+(?:really\s+|very\s+|pretty\s+|quite\s+|super\s+)?(?:happy|sad|anxious|stressed|calm|energetic|tired|excited|depressed|grateful|worried|confident|frustrated|angry|peaceful|motivated|demotivated|overwhelmed|content|satisfied|unsatisfied|proud|ashamed|guilty|relieved|disappointed|hopeful|hopeless|lonely|connected|isolated|focused|scattered|productive|lazy|inspired|burned\s+out|exhausted|refreshed|energized)/i,
    /(?:mood|feeling)\s+(?:is|was)\s+(?:really\s+|very\s+)?(?:good|bad|great|terrible|ok|okay|fine|amazing|awful)/i,
  ]
  
  for (const pattern of moodPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const moodText = match[0]
      const mood = moodText.replace(/^(?:feeling|feel|am|feels|mood\s+is|feeling\s+really|feeling\s+very|feeling\s+pretty|mood|feeling)\s+(?:really\s+|very\s+|pretty\s+|quite\s+|super\s+)?/i, '').trim()
      const value = moodToValue(mood)
      return {
        domain: 'WELLNESS',
        type: 'MOOD_LOGGED',
        payload: { mood, value },
        confidence: 0.8,
      }
    }
  }

  // Nutrition patterns
  const nutritionMatch = lower.match(/(?:ate|consumed|had|took|ingested)\s+(?:a\s+)?([a-z\s]+?)(?:\s+with\s+)?(\d+(?:\.\d+)?)?\s*(?:calories?|kcal|grams?|g|oz)/i)
  if (nutritionMatch) {
    const food = nutritionMatch[1].trim()
    const calories = nutritionMatch[2] ? parseFloat(nutritionMatch[2]) : undefined
    return {
      domain: 'WELLNESS',
      type: 'NUTRITION_LOGGED',
      payload: { food, calories },
      confidence: 0.75,
    }
  }

  // ===== WORKOUT PATTERNS =====
  
  // Comprehensive workout patterns
  const workoutPatterns = [
    // "did 5 reps of squats at 100kg"
    /(?:did|performed|completed|finished|did\s+a\s+set\s+of)\s+(\d+)\s*(?:reps?|repetitions?|x|times)\s+(?:of\s+)?([a-z\s]+?)\s+(?:at|with|@|using)\s+(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lbs?|pounds?|lb)/i,
    // "squat 5x100kg" or "deadlift 3x150kg"
    /([a-z\s]+?)\s+(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lbs?|pounds?|lb)/i,
    // "5 squats at 100kg"
    /(\d+)\s+([a-z\s]+?)\s+(?:at|@|with|using)\s+(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lbs?|pounds?|lb)/i,
    // "50 russian dead lifts" or "30 squats" - just reps, no weight
    /(\d+)\s+([a-z\s]+?)\s*(?:deadlift|dead\s+lift|squat|bench|press|lunge|curl|extension|row|pull|push|fly|raise|crunch|sit-up|push-up|pull-up|dip|extension|tricep|bicep|shoulder|leg|chest|back|abs|abdominal)/i,
    // "ran 5km" or "ran for 30 minutes"
    /(?:ran|run|running|jogged|jogging|sprinted|sprinting)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:km|kilometers?|miles?|mi|minutes?|min|hours?|hrs?|h)/i,
    // "biked 10 miles" or "cycled 20km"
    /(?:biked|biking|cycled|cycling|rode|riding)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:km|kilometers?|miles?|mi|minutes?|min|hours?|hrs?)/i,
    // "swam 500 meters" or "swimming for 20 minutes"
    /(?:swam|swimming|swim)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:meters?|metres?|m|yards?|km|kilometers?|minutes?|min|hours?|hrs?)/i,
    // "walked 5km" or "walking for 30 minutes"
    /(?:walked|walking|walk)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:km|kilometers?|miles?|mi|steps?|minutes?|min|hours?|hrs?)/i,
    // "yoga for 30 minutes" or "did yoga"
    /(?:did|practiced|practised|did\s+a\s+session\s+of)\s+(?:yoga|pilates|stretching|meditation|martial\s+arts)\s+(?:for\s+)?(\d+(?:\.\d+)?)?\s*(?:minutes?|min|hours?|hrs?)?/i,
  ]
  
  for (const pattern of workoutPatterns) {
    const match = lower.match(pattern)
    if (match) {
      // Cardio patterns (running, biking, swimming, walking)
      if (lower.match(/(?:run|ran|jog|bike|cycl|swim|walk)/)) {
        const value = parseFloat(match[1] || match[2])
        let unit = 'km'
        if (lower.match(/km|kilometer/)) unit = 'km'
        else if (lower.match(/mile|mi/)) unit = 'miles'
        else if (lower.match(/minute|min|m\s+(?!km|mile)/)) unit = 'minutes'
        else if (lower.match(/hour|hr/)) unit = 'hours'
        else if (lower.match(/meter|metre|m\s+(?!km|mile)/)) unit = 'meters'
        else if (lower.match(/yard/)) unit = 'yards'
        else if (lower.match(/step/)) unit = 'steps'
        
        return {
          domain: 'WORKOUT',
          type: 'WORKOUT_COMPLETED',
          payload: { 
            exercise: lower.match(/run|ran|jog/) ? 'running' :
                     lower.match(/bike|cycl/) ? 'cycling' :
                     lower.match(/swim/) ? 'swimming' :
                     lower.match(/walk/) ? 'walking' : 'cardio',
            distance: unit.includes('km') || unit.includes('mile') || unit.includes('meter') || unit.includes('yard') || unit === 'steps' ? value : undefined,
            duration: unit.includes('minute') || unit.includes('hour') ? value : undefined,
            unit,
          },
          confidence: 0.8,
        }
      }
      
      // Yoga/meditation patterns
      if (lower.match(/(?:yoga|pilates|stretching|meditation|martial)/)) {
        const duration = match[1] ? parseFloat(match[1]) : undefined
        return {
          domain: 'WORKOUT',
          type: 'WORKOUT_COMPLETED',
          payload: {
            exercise: lower.match(/yoga/) ? 'yoga' :
                    lower.match(/pilates/) ? 'pilates' :
                    lower.match(/stretching/) ? 'stretching' :
                    lower.match(/meditation/) ? 'meditation' : 'flexibility',
            duration,
            unit: duration ? 'minutes' : undefined,
          },
          confidence: 0.75,
        }
      }
      
      // Weight training patterns
      let reps: number | undefined
      let exercise: string | undefined
      let weight: number = 0
      const unit = lower.includes('kg') || lower.includes('kilogram') ? 'kg' : 'lbs'
      
      // Handle "50 russian dead lifts" pattern - just reps, no weight
      const repsOnlyMatch = lower.match(/(\d+)\s+([a-z\s]+?)\s*(?:deadlift|dead\s+lift|squat|bench|press|lunge|curl|extension|row|pull|push|fly|raise|crunch|sit-up|push-up|pull-up|dip|tricep|bicep|shoulder|leg|chest|back|abs|abdominal)/i)
      if (repsOnlyMatch && !lower.match(/at|with|@|\d+\s*kg|\d+\s*lbs/i)) {
        reps = parseInt(repsOnlyMatch[1])
        // Extract exercise name from the full text
        const exerciseMatch = lower.match(/(?:russian|sumo|conventional|bulgarian|goblet|front|back|overhead|incline|decline|flat|dumbbell|barbell|bodyweight|weighted)?\s*(?:deadlift|dead\s+lift|squat|bench|press|lunge|curl|extension|row|pull|push|fly|raise|crunch|sit-up|push-up|pull-up|dip|tricep|bicep|shoulder|leg|chest|back|abs|abdominal)/i)
        if (exerciseMatch) {
          exercise = exerciseMatch[0].trim()
        }
      } else {
        // Patterns with weight
        reps = parseInt(match[1] || match[2])
        exercise = (match[2] || match[1] || '').trim()
        weight = parseFloat(match[3] || match[2] || '0')
      }
      
      if (exercise && reps && reps > 0) {
        return {
          domain: 'WORKOUT',
          type: weight > 0 ? 'SET_COMPLETED' : 'WORKOUT_COMPLETED',
          payload: weight > 0 
            ? { exercise: exercise.trim(), reps, weight, unit }
            : { exercise: exercise.trim(), reps, notes: original },
          confidence: 0.85,
        }
      }
    }
  }

  // ===== HABIT PATTERNS =====
  
  // Common habit phrases that users might say
  const commonHabits: Record<string, string> = {
    'quit smoking': 'quit smoking',
    'quit cigarettes': 'quit smoking',
    'stop smoking': 'quit smoking',
    'no smoking': 'quit smoking',
    'eating healthier': 'eat healthy',
    'eating healthy': 'eat healthy',
    'eat healthier': 'eat healthy',
    'eat healthy': 'eat healthy',
    'healthy eating': 'eat healthy',
    'drank water': 'drink water',
    'drinking water': 'drink water',
    'drink water': 'drink water',
    'exercise': 'exercise',
    'exercised': 'exercise',
    'workout': 'exercise',
    'meditation': 'meditate',
    'meditated': 'meditate',
    'meditate': 'meditate',
    'journaling': 'journal',
    'journaled': 'journal',
    'journal': 'journal',
    'reading': 'read',
    'read': 'read',
    'walking': 'walk',
    'walked': 'walk',
    'walk': 'walk',
    'yoga': 'yoga',
    'stretching': 'stretch',
    'stretched': 'stretch',
    'stretch': 'stretch',
  }
  
  // Normalize habit name
  const normalizeHabit = (habit: string): string => {
    const lowerHabit = habit.toLowerCase().trim()
    // Check common habits first
    for (const [key, normalized] of Object.entries(commonHabits)) {
      if (lowerHabit.includes(key) || key.includes(lowerHabit)) {
        return normalized
      }
    }
    // Otherwise, clean up the extracted text
    return habit.trim().toLowerCase()
  }
  
  const habitPatterns = [
    // Direct mentions: "quitting smoking", "eating healthier", "drank water"
    /(?:quit|quitting|stopped?|staying\s+away\s+from|abstained\s+from)\s+(?:smoking|cigarettes|tobacco)/i,
    /(?:eating|eat|ate)\s+(?:healthier|healthy)/i,
    /(?:drank|drinking|drink)\s+(?:water|h2o)/i,
    /(?:did|completed|finished|did\s+my)\s+(?:exercise|workout|meditation|journaling|reading|walking|yoga|stretching)/i,
    
    // Pattern-based: "completed my X habit"
    /(?:completed|did|finished|checked\s+off|marked|accomplished|stuck\s+to)\s+(?:my\s+)?([a-z\s]{2,40}?)\s+(?:habit|today|off|task|routine)/i,
    /(?:habit|routine|goal)\s+(?:of\s+)?([a-z\s]{2,40}?)\s+(?:completed|done|finished|accomplished)/i,
    
    // Simple: "I X today" where X is a habit
    /(?:i\s+)?(?:quit|stopped|started|continued|did|completed|finished)\s+(?:smoking|exercising|eating\s+healthy|meditating|journaling|reading|walking|yoga)/i,
  ]
  
  for (const pattern of habitPatterns) {
    const match = lower.match(pattern)
    if (match) {
      let habit: string
      
      // If pattern has capture group, use it
      if (match[1]) {
        habit = normalizeHabit(match[1])
      } else {
        // Otherwise extract from the full match
        const fullMatch = match[0]
        if (fullMatch.includes('smoking') || fullMatch.includes('cigarettes')) {
          habit = 'quit smoking'
        } else if (fullMatch.includes('healthy') || fullMatch.includes('healthier')) {
          habit = 'eat healthy'
        } else if (fullMatch.includes('water')) {
          habit = 'drink water'
        } else if (fullMatch.includes('exercise') || fullMatch.includes('workout')) {
          habit = 'exercise'
        } else if (fullMatch.includes('meditat')) {
          habit = 'meditate'
        } else if (fullMatch.includes('journal')) {
          habit = 'journal'
        } else if (fullMatch.includes('read')) {
          habit = 'read'
        } else if (fullMatch.includes('walk')) {
          habit = 'walk'
        } else if (fullMatch.includes('yoga')) {
          habit = 'yoga'
        } else if (fullMatch.includes('stretch')) {
          habit = 'stretch'
        } else {
          // Fallback: extract meaningful words
          const words = fullMatch.split(/\s+/).filter(w => 
            !['i', 'my', 'the', 'a', 'an', 'did', 'completed', 'finished', 'habit', 'today', 'off', 'task', 'routine', 'goal'].includes(w.toLowerCase())
          )
          habit = normalizeHabit(words.slice(0, 3).join(' '))
        }
      }
      
      if (habit && habit.length > 0 && habit.length < 50) {
        return {
          domain: 'HABIT',
          type: 'HABIT_COMPLETED',
          payload: { habit },
          confidence: 0.85, // Higher confidence for specific habits
        }
      }
    }
  }

  // ===== PRODUCTIVITY PATTERNS =====
  
  const productivityPatterns = [
    /(?:worked|working|built|building|completed|finished|improving|improved|did|accomplished)\s+(?:on\s+)?(?:more\s+like\s+)?(\d+)\s*(?:coding\s+)?(?:projects?|apps?|tasks?|things|items|features|bugfixes|bugs)/i,
    /(\d+)\s*(?:coding\s+)?(?:projects?|apps?|tasks?|features|bugfixes|bugs)/i,
    /(?:did|completed|finished|worked\s+on)\s+(?:more\s+like\s+)?(\d+)\s*(?:things?|items?|tasks?|projects?|apps?|features)/i,
    /(?:improving|improved|working\s+on)\s+(?:my\s+)?(?:portfolio|code|projects?|app|website).*?(?:like\s+)?(\d+)/i,
    /(?:pomodoro|focus\s+session|deep\s+work)\s+(?:for\s+)?(\d+)\s*(?:minutes?|min|hours?|hrs?)/i,
    /(?:focused|concentrated)\s+(?:for\s+)?(\d+)\s*(?:minutes?|min|hours?|hrs?)/i,
  ]
  
  for (const pattern of productivityPatterns) {
    const match = lower.match(pattern)
    if (match && (lower.includes('work') || lower.includes('build') || lower.includes('code') || 
                  lower.includes('project') || lower.includes('app') || lower.includes('task') || 
                  lower.includes('portfolio') || lower.includes('improving') || lower.includes('pomodoro') ||
                  lower.includes('focus'))) {
      const count = parseInt(match[1] || match[2] || match[3])
      if (count > 0) {
        if (lower.match(/pomodoro|focus|deep\s+work|concentrated/)) {
          return {
            domain: 'PRODUCTIVITY',
            type: 'FOCUS_SESSION',
            payload: { 
              duration: count,
              unit: lower.match(/hour|hr/) ? 'hours' : 'minutes',
            },
            confidence: 0.8,
          }
        }
        
        return {
          domain: 'PRODUCTIVITY',
          type: 'PROJECT_COMPLETED',
          payload: { 
            type: 'PROJECT',
            count,
            description: original,
          },
          confidence: 0.8,
        }
      }
    }
  }

  // ===== JOB PATTERNS =====
  
  const jobPatterns = [
    // "applied to company X" or "submitted application for Y"
    /(?:applied|submitted|sent|put\s+in)\s+(?:an?\s+)?(?:application|application\s+for)?\s*(?:to|for|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    // "finding jobs to apply to, i have 5 i need to apply to"
    /(?:finding|found|have|need|need\s+to\s+apply\s+to|discovered)\s+(?:jobs?|positions?|applications?|opportunities?).*?(?:have|need|found)\s+(\d+)/i,
    // "i have 5 jobs to apply to" or "5 job applications"
    /(?:have|need|found|applying\s+to|got|discovered)\s+(\d+)\s+(?:jobs?|positions?|applications?|opportunities?)(?:\s+to\s+(?:apply|apply\s+to|submit))?/i,
    // "found 5 job opportunities"
    /(?:found|have|discovered|saw|see|seeing)\s+(\d+)\s+(?:job|position|opportunit)(?:ies|y)/i,
    // "found a job to apply to" or "i found a job"
    /(?:found|discovered|saw|see|seeing|came\s+across|stumbled\s+upon)\s+(?:a\s+)?(?:job|position|opportunity|role|opening)(?:\s+to\s+(?:apply|apply\s+to|submit))?/i,
    // "job to apply to" or "job posting"
    /(?:job|position|opportunity|role|opening|posting)(?:\s+to\s+(?:apply|apply\s+to|submit))?/i,
    // "interview at Company X" or "got an interview"
    /(?:got|have|had|scheduled|booked)\s+(?:an?\s+)?(?:interview|meeting|call)\s+(?:with|at|for)\s+([A-Z][a-z]+)?/i,
    // "received offer from Company"
    /(?:received|got|accepted|declined)\s+(?:an?\s+)?(?:offer|job\s+offer)\s+(?:from|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ]
  
  const isJobRelated = lower.match(/(?:job|position|opportunity|apply|application|career|hiring|role|interview|offer|rejection|rejected|accepted|declined)/)
  
  if (isJobRelated) {
    for (const pattern of jobPatterns) {
      const match = original.match(pattern)
      if (match) {
        const count = match[1] ? parseInt(match[1]) : undefined
        const company = match[1] && !count ? match[1].trim() : 
                       match[2] ? match[2].trim() : undefined
        
        // Extract job info
        const jobInfo = extractJobInfo(original)
        const url = extractUrl(original)
        
        if (lower.match(/interview/)) {
          return {
            domain: 'JOBS',
            type: 'JOB_INTERVIEW',
            payload: { 
              company: company || jobInfo.company || 'Unknown',
              role: jobInfo.role,
              url,
              notes: original,
            },
            confidence: 0.85,
          }
        } else if (lower.match(/offer|received|got|accepted|declined/)) {
          const salaryMatch = original.match(/(?:salary|pay|compensation)\s+(?:of\s+)?(?:[\$£€¥]|usd|gbp|eur)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i)
          const salary = salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, '')) : undefined
          
          return {
            domain: 'JOBS',
            type: 'JOB_OFFER',
            payload: { 
              company: company || jobInfo.company || 'Unknown',
              role: jobInfo.role,
              salary,
              url,
              status: lower.match(/accepted/) ? 'ACCEPTED' : lower.match(/declined/) ? 'DECLINED' : 'PENDING',
              notes: original,
            },
            confidence: 0.85,
          }
        } else if (count && count > 0) {
          return {
            domain: 'JOBS',
            type: 'JOB_FOUND',
            payload: { count, notes: original },
            confidence: 0.85,
          }
        } else if (company && company.length > 1) {
          return {
            domain: 'JOBS',
            type: 'JOB_APPLIED',
            payload: { 
              company,
              role: jobInfo.role,
              status: 'APPLIED',
              url,
            },
            confidence: 0.85,
          }
        } else if (jobInfo.company || jobInfo.role || url) {
          // Only create if we have at least company name
          if (jobInfo.company && jobInfo.company !== 'Unknown') {
            return {
              domain: 'JOBS',
              type: 'JOB_APPLIED',
              payload: { 
                company: jobInfo.company,
                role: jobInfo.role,
                status: 'INTERESTED',
                url,
                notes: original,
              },
              confidence: 0.75,
            }
          }
          // If we have URL but no company, mark as incomplete
          return {
            domain: 'JOBS',
            type: 'JOB_FOUND',
            payload: { count: 1, notes: original, incomplete: true, url },
            confidence: 0.6,
          }
        } else {
          return {
            domain: 'JOBS',
            type: 'JOB_FOUND',
            payload: { count: 1, notes: original, incomplete: true },
            confidence: 0.6,
          }
        }
      }
    }
    
    // If job-related but no pattern matched
    return {
      domain: 'JOBS',
      type: 'JOB_FOUND',
      payload: { count: 1, notes: original, incomplete: true },
      confidence: 0.5,
    }
  }

  // ===== FINANCE PATTERNS =====
  
  const financePatterns = [
    /(?:spent|spend|paid|bought|purchased|expensed)\s+(?:[\$£€¥]|usd|gbp|eur)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:on|for|at)\s+([a-z\s]+)/i,
    /(?:earned|made|received|got|income|salary)\s+(?:[\$£€¥]|usd|gbp|eur)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /(?:bill|subscription|payment|invoice)\s+(?:of|for)\s+(?:[\$£€¥]|usd|gbp|eur)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
  ]
  
  for (const pattern of financePatterns) {
    const match = lower.match(pattern)
    if (match) {
      const currency = extractCurrency(original)
      const amount = currency?.amount || parseFloat((match[1] || match[2] || '').replace(/,/g, ''))
      const currencyCode = currency?.currency || 'USD'
      
      if (lower.match(/spent|spend|paid|bought|purchased|expensed|bill|subscription|payment|invoice/)) {
        const category = match[2] || match[1] || 'Other'
        return {
          domain: 'FINANCES',
          type: 'EXPENSE_LOGGED',
          payload: { 
            amount,
            currency: currencyCode,
            category: category.trim(),
            notes: original,
          },
          confidence: 0.85,
        }
      } else if (lower.match(/earned|made|received|got|income|salary/)) {
        return {
          domain: 'FINANCES',
          type: 'INCOME_LOGGED',
          payload: { 
            amount,
            currency: currencyCode,
            notes: original,
          },
          confidence: 0.85,
        }
      }
    }
  }

  // ===== LEARNING PATTERNS =====
  
  const learningPatterns = [
    /(?:started|began|starting)\s+(?:a\s+)?(?:course|class|tutorial|video|book|article|podcast)\s+(?:on|about|called)\s+(?:["'])?([^"']+?)(?:["'])?/i,
    /(?:finished|completed|read|finished\s+reading)\s+(?:a\s+)?(?:course|class|tutorial|book|article|chapter|section|podcast)\s+(?:on|about|called)\s+(?:["'])?([^"']+?)(?:["'])?/i,
    /(?:read|reading)\s+(\d+)\s*(?:pages?|chapters?|sections?)\s+(?:of\s+)?(?:["'])?([^"']+?)(?:["'])?/i,
    /(?:learned|learning|studied|studying)\s+(?:about|how\s+to)\s+(?:["'])?([^"']+?)(?:["'])?/i,
  ]
  
  for (const pattern of learningPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const title = match[1] || match[2] || 'Untitled'
      const pages = match[1] ? parseInt(match[1]) : undefined
      
      let type = 'COURSE'
      if (lower.match(/book|read|reading|chapter|pages/)) type = 'BOOK'
      else if (lower.match(/article|blog|post/)) type = 'ARTICLE'
      else if (lower.match(/video|tutorial|youtube/)) type = 'VIDEO'
      else if (lower.match(/podcast/)) type = 'PODCAST'
      
      if (lower.match(/started|began|starting/)) {
        return {
          domain: 'LEARNING',
          type: 'COURSE_STARTED',
          payload: { 
            type,
            title: title.trim(),
            progress: 0,
          },
          confidence: 0.8,
        }
      } else {
        return {
          domain: 'LEARNING',
          type: 'BOOK_READ',
          payload: { 
            type,
            title: title.trim(),
            progress: pages ? pages : 100,
            pages,
          },
          confidence: 0.8,
        }
      }
    }
  }

  // ===== HEALTH PATTERNS =====
  
  const healthPatterns = [
    /(?:symptom|feeling|experiencing|have|having)\s+(?:a\s+)?([a-z\s]+?)(?:pain|ache|discomfort|symptom)/i,
    /(?:took|taking|medication|medicine|pill|tablet)\s+(?:a\s+)?([a-z\s]+?)(?:\s+for\s+)?([a-z\s]+?)?/i,
    /(?:blood\s+pressure|bp|heart\s+rate|hr|temperature|temp|weight|pulse)\s+(?:is|was|at)\s+(\d+(?:\.\d+)?)/i,
  ]
  
  for (const pattern of healthPatterns) {
    const match = lower.match(pattern)
    if (match) {
      if (lower.match(/symptom|feeling|experiencing|pain|ache|discomfort/)) {
        return {
          domain: 'HEALTH',
          type: 'SYMPTOM_LOGGED',
          payload: { 
            symptom: match[1].trim(),
            notes: original,
          },
          confidence: 0.75,
        }
      } else if (lower.match(/medication|medicine|pill|tablet|took|taking/)) {
        return {
          domain: 'HEALTH',
          type: 'MEDICATION_TAKEN',
          payload: { 
            medication: match[1].trim(),
            condition: match[2]?.trim(),
          },
          confidence: 0.75,
        }
      } else if (lower.match(/blood\s+pressure|bp|heart\s+rate|hr|temperature|temp|weight|pulse/)) {
        const value = parseFloat(match[1])
        let unit = 'unknown'
        if (lower.match(/blood\s+pressure|bp/)) unit = 'mmHg'
        else if (lower.match(/heart\s+rate|hr|pulse/)) unit = 'bpm'
        else if (lower.match(/temperature|temp/)) unit = '°C'
        else if (lower.match(/weight/)) unit = 'kg'
        
        return {
          domain: 'HEALTH',
          type: 'VITAL_LOGGED',
          payload: { 
            type: lower.match(/blood\s+pressure|bp/) ? 'blood_pressure' :
                   lower.match(/heart\s+rate|hr|pulse/) ? 'heart_rate' :
                   lower.match(/temperature|temp/) ? 'temperature' : 'weight',
            value,
            unit,
          },
          confidence: 0.8,
        }
      }
    }
  }

  // ===== SOBRIETY PATTERNS =====
  
  if (lower.match(/(?:sober|sobriety|clean|relapse|craving|urge|day\s+\d+)/)) {
    const dayMatch = lower.match(/(?:day\s+)?(\d+)/)
    const days = dayMatch ? parseInt(dayMatch[1]) : undefined
    const status = lower.match(/relapse|relapsed/) ? 'relapsed' :
                   lower.match(/craving|urge/) ? 'craving' : 'sober'
    const craving = lower.match(/craving|urge/) ? 
                    (lower.match(/strong|intense|very/) ? 8 : 5) : undefined
    
    return {
      domain: 'SOBRIETY',
      type: 'SOBRIETY_LOGGED',
      payload: { 
        status,
        days,
        craving,
        notes: original,
      },
      confidence: 0.8,
    }
  }

  // ===== ROUTINE PATTERNS =====
  
  if (lower.match(/(?:routine|checklist|checked|completed|done)\s+(?:my\s+)?([a-z\s]+?)\s+(?:routine|checklist)/i)) {
    const match = lower.match(/(?:routine|checklist|checked|completed|done)\s+(?:my\s+)?([a-z\s]+?)\s+(?:routine|checklist)/i)
    if (match) {
      return {
        domain: 'ROUTINE',
        type: 'ROUTINE_CHECKED',
        payload: { 
          routine: match[1].trim(),
          status: 'completed',
        },
        confidence: 0.75,
      }
    }
  }

  // ===== TODO/LIST PATTERNS =====
  
  const todoPatterns = [
    // "add todo: buy milk" or "add to list: groceries"
    /(?:add|create|new)\s+(?:todo|task|item|list\s+item)\s*:?\s*(.+)/i,
    // "mark X as done" or "complete X"
    /(?:mark|check|complete|finish|done|tick)\s+(?:off\s+)?(.+?)\s+(?:as\s+)?(?:done|completed|finished)/i,
    // "X is done" or "finished X"
    /(.+?)\s+(?:is|was)\s+(?:done|completed|finished)/i,
    // Simple todo list: "todo: buy milk, get groceries, call mom"
    /(?:todo|todos|list|tasks)\s*:?\s*(.+)/i,
  ]
  
  for (const pattern of todoPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const todoText = match[1].trim()
      
      // If it's a completion pattern
      if (lower.match(/mark|check|complete|finish|done|tick|is\s+done|was\s+done/)) {
        return {
          domain: 'LISTS',
          type: 'TASK_COMPLETED',
          payload: { 
            title: todoText,
            status: 'completed',
          },
          confidence: 0.8,
        }
      }
      
      // If it's multiple items separated by commas
      if (todoText.includes(',')) {
        const items = todoText.split(',').map(i => i.trim()).filter(i => i.length > 0)
        return {
          domain: 'LISTS',
          type: 'TASKS_ADDED',
          payload: { 
            items: items.map(title => ({ title, status: 'todo' })),
          },
          confidence: 0.85,
        }
      }
      
      // Single todo item
      return {
        domain: 'LISTS',
        type: 'TASK_ADDED',
        payload: { 
          title: todoText,
          status: 'todo',
        },
        confidence: 0.85,
      }
    }
  }

  return null
}

function moodToValue(mood: string): number {
  const moodMap: Record<string, number> = {
    happy: 8,
    excited: 9,
    grateful: 8,
    calm: 7,
    confident: 8,
    energetic: 7,
    peaceful: 8,
    motivated: 8,
    inspired: 9,
    content: 7,
    satisfied: 7,
    proud: 8,
    relieved: 7,
    hopeful: 8,
    connected: 8,
    focused: 7,
    productive: 8,
    refreshed: 8,
    energized: 8,
    tired: 4,
    sad: 3,
    anxious: 4,
    stressed: 3,
    worried: 4,
    depressed: 2,
    frustrated: 3,
    angry: 2,
    overwhelmed: 3,
    demotivated: 3,
    unsatisfied: 4,
    ashamed: 2,
    guilty: 3,
    disappointed: 3,
    hopeless: 2,
    lonely: 3,
    isolated: 3,
    scattered: 4,
    lazy: 4,
    'burned out': 2,
    exhausted: 2,
    terrible: 1,
    awful: 1,
    bad: 3,
    ok: 5,
    okay: 5,
    fine: 5,
    good: 7,
    great: 8,
    amazing: 9,
  }
  return moodMap[mood.toLowerCase()] || 5
}

// Enhanced LLM-based parsing with comprehensive prompt
export async function parseWithLLM(
  text: string, 
  openaiKey?: string,
  existingDomains?: string[]
): Promise<{ events?: ParsedEvent[]; response?: string; suggestedCategory?: { name: string; reason: string } } | null> {
  if (!openaiKey) {
    console.warn('OpenAI API key not provided, skipping LLM parsing')
    return null
  }

  try {
    const domainList = existingDomains?.join(', ') || 'WELLNESS, WORKOUT, HABIT, JOBS, FINANCES, LEARNING, PRODUCTIVITY, HEALTH, SOBRIETY, ROUTINE, LISTS'
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert natural language parser for a comprehensive life tracking app. Extract structured data from user input with maximum accuracy.

Return JSON only with this exact structure:
{
  "domain": "WELLNESS" | "WORKOUT" | "HABIT" | "JOBS" | "FINANCES" | "LEARNING" | "PRODUCTIVITY" | "HEALTH" | "SOBRIETY" | "ROUTINE" | null,
  "type": "specific event type",
  "payload": { ... },
  "confidence": 0.0-1.0,
  "suggestedCategory": { "name": "CATEGORY_NAME", "reason": "why this category would be useful" } | null
}

Existing domains: ${domainList}

COMPREHENSIVE DOMAIN AND TYPE SPECIFICATIONS:

WELLNESS:
- WATER_LOGGED: { amount: number, unit: "ml"|"cups"|"oz"|"liters"|"pints" }
- SLEEP_LOGGED: { hours: number }
- MOOD_LOGGED: { mood: string, value: number (1-10) }
- NUTRITION_LOGGED: { food: string, calories?: number }

WORKOUT:
- SET_COMPLETED: { exercise: string, reps: number, weight: number, unit: "kg"|"lbs" }
- WORKOUT_COMPLETED: { exercise: string, reps?: number, distance?: number, duration?: number, unit: string }

HABIT:
- HABIT_COMPLETED: { habit: string }
  - habit should be normalized (e.g., "quit smoking", "eat healthy", "exercise", "meditate", "journal", "read", "walk", "yoga")
  - Common habits: quit smoking, eat healthy, drink water, exercise, meditate, journal, read, walk, yoga, stretch
  - Extract the specific habit name from phrases like "quitting smoking", "eating healthier", "did my exercise"

JOBS:
- JOB_APPLIED: { company: string, role?: string, status: "APPLIED"|"INTERESTED", url?: string, salary?: number }
  - When user says "i want to apply" or "apply to this job" with a URL, extract company and role from URL
  - Extract company from hostname (e.g., vercel.com -> "Vercel")
  - Extract role from URL path (e.g., /careers/product-engineer -> "Product Engineer")
  - If URL is provided, ALWAYS include it in the payload
  - If user says "extract from link", try to get company and role from the URL structure
- JOB_FOUND: { count: number, incomplete?: boolean, notes?: string }
- JOB_INTERVIEW: { company: string, role?: string, url?: string, notes?: string }
- JOB_OFFER: { company: string, role?: string, salary?: number, status: "PENDING"|"ACCEPTED"|"DECLINED", url?: string }

FINANCES:
- EXPENSE_LOGGED: { amount: number, currency: "USD"|"GBP"|"EUR"|"JPY", category: string, notes?: string }
- INCOME_LOGGED: { amount: number, currency: "USD"|"GBP"|"EUR"|"JPY", notes?: string }

LEARNING:
- COURSE_STARTED: { type: "COURSE"|"BOOK"|"VIDEO"|"ARTICLE"|"PODCAST", title: string, progress: number }
- COURSE_COMPLETED: { type: string, title: string, progress: 100 }
- BOOK_READ: { type: "BOOK", title: string, pages?: number, progress?: number }

PRODUCTIVITY:
- TASK_COMPLETED: { type: string, count?: number, description?: string }
- PROJECT_COMPLETED: { type: "PROJECT", count: number, description?: string }
- FOCUS_SESSION: { duration: number, unit: "minutes"|"hours" }
- POMODORO_COMPLETED: { duration: 25, unit: "minutes" }

HEALTH:
- SYMPTOM_LOGGED: { symptom: string, notes?: string }
- MEDICATION_TAKEN: { medication: string, condition?: string }
- VITAL_LOGGED: { type: "blood_pressure"|"heart_rate"|"temperature"|"weight", value: number, unit: string }

SOBRIETY:
- SOBRIETY_LOGGED: { status: "sober"|"craving"|"relapsed", days?: number, craving?: number (1-10), notes?: string }

ROUTINE:
- ROUTINE_CHECKED: { routine: string, status: "completed"|"partial" }

EXTRACTION RULES:
1. Extract ALL numbers, units, dates, URLs, company names, job titles from the text
2. For JOBS: Extract company names, job titles, URLs, salary amounts. If incomplete, set incomplete: true
3. For FINANCES: Extract currency symbols/words and amounts. Default to USD if unspecified
4. For WORKOUT: Extract exercise names, reps, weights, distances, durations
5. For WELLNESS: Extract amounts and units (convert to standard units)
6. Parse dates and times when mentioned ("yesterday", "today", "last week")

IMPORTANT:
- When user mentions jobs but doesn't provide details, return domain: "JOBS", type: "JOB_FOUND", payload: { incomplete: true }
- Do NOT categorize vague job mentions as PRODUCTIVITY
- Extract URLs from job postings and include in payload
- If input doesn't fit any domain but is trackable, return suggestedCategory
- Confidence should reflect how certain you are (0.9+ for clear matches, 0.6-0.8 for partial, <0.6 for unsure)

EXAMPLES:
- "i want to apply to this job\nhttps://vercel.com/careers/product-engineer-v0-5466858004" → { domain: "JOBS", type: "JOB_APPLIED", payload: { company: "Vercel", role: "Product Engineer V0", status: "INTERESTED", url: "https://vercel.com/careers/product-engineer-v0-5466858004" }, confidence: 0.95 }
- "i found a job to apply to" → { domain: "JOBS", type: "JOB_FOUND", payload: { incomplete: true, count: 1 }, confidence: 0.7 }
- "applied to Google for software engineer role" → { domain: "JOBS", type: "JOB_APPLIED", payload: { company: "Google", role: "software engineer", status: "APPLIED" }, confidence: 0.9 }
- "found a job posting at https://example.com/careers/engineer" → { domain: "JOBS", type: "JOB_APPLIED", payload: { company: "Example", role: "Engineer", status: "INTERESTED", url: "https://example.com/careers/engineer" }, confidence: 0.9 }
- "extract from link\nhttps://company.com/jobs/data-scientist" → { domain: "JOBS", type: "JOB_APPLIED", payload: { company: "Company", role: "Data Scientist", status: "INTERESTED", url: "https://company.com/jobs/data-scientist" }, confidence: 0.9 }
- "spent $50 on groceries" → { domain: "FINANCES", type: "EXPENSE_LOGGED", payload: { amount: 50, currency: "USD", category: "groceries" }, confidence: 0.9 }

CRITICAL FOR JOBS:
- When you see a URL in the text, ALWAYS extract company name from hostname
- Extract job title/role from URL path segments (especially after /careers/, /jobs/, /positions/)
- Convert URL path segments to readable role names (e.g., "product-engineer-v0" → "Product Engineer V0")
- If user says "extract from link" or "extract from URL", prioritize extracting all possible info from the URL
- Include the full URL in the payload.url field
- Use confidence 0.9+ when you successfully extract both company and role from URL`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Lower temperature for more consistent parsing
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    
    // If it suggests a new category
    if (parsed.suggestedCategory && !parsed.domain) {
      return {
        response: `I couldn't categorize that. Would you like to create a "${parsed.suggestedCategory.name}" category? This sounds like it could track ${parsed.suggestedCategory.reason}.`,
        suggestedCategory: parsed.suggestedCategory,
      }
    }
    
    // If it parsed into an existing domain
    if (parsed.domain && parsed.type && parsed.payload) {
      const event = parsed as ParsedEvent
      
      // Handle incomplete job events
      if (event.domain === 'JOBS' && event.payload?.incomplete) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/i)
        if (urlMatch) {
          return {
            events: [],
            response: `Great! I found a job link: ${urlMatch[1]}\n\nI can help track this job. Can you tell me:\n• Company name\n• Job title/role\n\nOr I can try to extract details from the link.`,
          }
        } else {
          return {
            events: [],
            response: `I'd love to help you track this job! Can you share:\n• The company name\n• The job title/role\n• A link to the job posting (if you have one)\n\nI can use the link to automatically fill in details like company, title, and location.`,
          }
        }
      }
      
      return {
        events: [event],
        response: generateConfirmation(event),
      }
    }

    return null
  } catch (error) {
    console.error('LLM parsing error:', error)
    return null
  }
}

// Main parsing function (LLM-first approach for better accuracy)
export async function parseInput(
  text: string,
  openaiKey?: string,
  existingDomains?: string[]
): Promise<{ events: ParsedEvent[]; response: string; suggestedCategory?: { name: string; reason: string } }> {
  // Check for job URLs first and try to extract details
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/i)
  if (urlMatch && text.toLowerCase().match(/(?:job|apply|position|career|role)/)) {
    const extracted = await extractJobFromUrl(urlMatch[1])
    if (extracted.company || extracted.role) {
      // If we extracted info, use LLM to create proper event
      const enhancedText = `${text}\n\nExtracted from URL: Company: ${extracted.company || 'unknown'}, Role: ${extracted.role || 'unknown'}`
      if (openaiKey) {
        const llmResult = await parseWithLLM(enhancedText, openaiKey, existingDomains)
        if (llmResult && llmResult.events && llmResult.events.length > 0) {
          // Enhance the event with extracted info
          const event = llmResult.events[0]
          if (event.domain === 'JOBS') {
            event.payload.company = extracted.company || event.payload.company
            event.payload.role = extracted.role || event.payload.role
            event.payload.url = urlMatch[1]
            event.confidence = 0.9 // Higher confidence with URL extraction
          }
          return {
            events: [event],
            response: llmResult.response || generateConfirmation(event),
            suggestedCategory: llmResult.suggestedCategory,
          }
        }
      }
    }
  }

  // PRIMARY: Use LLM first (smarter, more accurate)
  if (openaiKey) {
    const llmResult = await parseWithLLM(text, openaiKey, existingDomains)
    if (llmResult) {
      // If LLM found events, use them
      if (llmResult.events && llmResult.events.length > 0) {
        return {
          events: llmResult.events,
          response: llmResult.response || llmResult.events.map(e => generateConfirmation(e)).join('\n'),
          suggestedCategory: llmResult.suggestedCategory,
        }
      }
      // If LLM provided response but no events, return it
      if (llmResult.response) {
        return {
          events: [],
          response: llmResult.response,
          suggestedCategory: llmResult.suggestedCategory,
        }
      }
    }
  }

  // FALLBACK: Use heuristics if LLM unavailable or failed
  const heuristicResult = parseWithHeuristics(text)

  if (heuristicResult) {
    // Check if job event is incomplete
    if (heuristicResult.domain === 'JOBS' && heuristicResult.payload?.incomplete) {
      if (urlMatch) {
        const extracted = await extractJobFromUrl(urlMatch[1])
        if (extracted.company || extracted.role) {
          // Create complete event with extracted info
          return {
            events: [{
              domain: 'JOBS',
              type: 'JOB_APPLIED',
              payload: {
                company: extracted.company || 'Unknown',
                role: extracted.role,
                status: 'INTERESTED',
                url: urlMatch[1],
              },
              confidence: 0.85,
            }],
            response: generateConfirmation({
              domain: 'JOBS',
              type: 'JOB_APPLIED',
              payload: {
                company: extracted.company || 'Unknown',
                role: extracted.role,
                status: 'INTERESTED',
                url: urlMatch[1],
              },
              confidence: 0.85,
            }),
          }
        }
        return {
          events: [],
          response: `Great! I found a job link: ${urlMatch[1]}\n\nI can help track this job. Can you tell me:\n• Company name\n• Job title/role\n\nOr I can try to extract details from the link.`,
        }
      } else {
        return {
          events: [],
          response: `I'd love to help you track this job! Can you share:\n• The company name\n• The job title/role\n• A link to the job posting (if you have one)\n\nI can use the link to automatically fill in details like company, title, and location.`,
        }
      }
    }
    
    if (heuristicResult.confidence > 0.7) {
      return {
        events: [heuristicResult],
        response: generateConfirmation(heuristicResult),
      }
    }
  }

  // Analyze text for category suggestions
  const suggestedCategory = analyzeForCategorySuggestion(text)
  
  // No parseable content - ask clarifying questions
  let response = "I'm not quite sure what you mean. Could you tell me more?"
  
  // Try to extract partial information and ask for clarification
  const lower = text.toLowerCase()
  
  // Check for job-related keywords FIRST (before work/productivity)
  if (lower.match(/(?:job|position|opportunity|apply|application|career|hiring|role|interview|offer)/)) {
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i)
    if (urlMatch) {
      response = `Great! I found a job link. I can help track this. What's the company name and role? Or paste the job posting link and I'll try to extract the details.`
    } else {
      response = `I'd love to help you track this job! Can you share:\n• The company name\n• The job title/role\n• A link to the job posting (if you have one)\n\nI can use the link to automatically fill in details like company, title, and location.`
    }
  } else if (lower.match(/(?:drank|drink|water|hydrated|liquid)/)) {
    response = "I heard something about water! How much did you drink? (e.g., '2 cups' or '500ml')"
  } else if (lower.match(/(?:worked|work|building|built|project|app|code)/)) {
    response = "Sounds like you did some work! What did you work on? (e.g., '3 coding projects' or 'built 2 apps')"
  } else if (lower.match(/(?:exercise|workout|gym|squat|deadlift|bench|lift|run|ran)/)) {
    response = "I heard something about exercise! What did you do? (e.g., 'did 5 squats at 100kg' or 'ran 5km')"
  } else if (lower.match(/(?:slept|sleep|bed|rest)/)) {
    response = "I heard something about sleep! How many hours did you sleep? (e.g., 'slept 7 hours')"
  } else if (lower.match(/(?:read|reading|book|pages)/)) {
    response = "I heard something about reading! What did you read? (e.g., 'read 50 pages' or 'finished a chapter')"
  } else if (lower.match(/(?:spent|bought|purchase|expense|money|cost)/)) {
    response = "I heard something about money! What did you spend? (e.g., 'spent $50 on groceries')"
  } else if (suggestedCategory) {
    response = `I couldn't categorize that. Would you like to create a "${suggestedCategory.name}" category? This sounds like it could track ${suggestedCategory.reason}.`
  } else {
    response = "I'm not sure how to track that. Could you give me more details? For example:\n• \"drank 2 cups of water\"\n• \"did 5 squats at 100kg\"\n• \"worked on 3 projects\"\n• \"found a job to apply to\"\n• \"slept 7 hours\""
  }

  return {
    events: [],
    response,
    suggestedCategory,
  }
}

function analyzeForCategorySuggestion(text: string): { name: string; reason: string } | undefined {
  const lower = text.toLowerCase()
  
  // Coding/development projects
  if (lower.match(/(?:coding|programming|building|developing|worked on|built)\s+(?:projects?|apps?|code|software)/)) {
    return {
      name: 'PROJECTS',
      reason: 'coding projects and development work',
    }
  }
  
  // Work/business
  if (lower.match(/(?:worked|working|business|work|meetings?|calls?)/)) {
    return {
      name: 'WORK',
      reason: 'work activities and business tasks',
    }
  }
  
  // Creative projects
  if (lower.match(/(?:creative|art|design|writing|music)/)) {
    return {
      name: 'CREATIVE',
      reason: 'creative projects and artistic work',
    }
  }
  
  return undefined
}

function generateConfirmation(event: ParsedEvent): string {
  const domainEmojis: Record<string, string> = {
    WELLNESS: '💧',
    WORKOUT: '💪',
    HABIT: '✅',
    JOBS: '💼',
    FINANCES: '💰',
    FINANCE: '💰',
    LEARNING: '📚',
    PRODUCTIVITY: '🎯',
    HEALTH: '🏥',
    SOBRIETY: '🌱',
    ROUTINE: '🔄',
  }

  const emoji = domainEmojis[event.domain] || '✨'
  
  switch (event.type) {
    case 'WATER_LOGGED':
      const waterAmount = event.payload.amount
      const waterUnit = event.payload.unit
      return `${emoji} Got it! Logged ${waterAmount} ${waterUnit} of water. Keep it up!`
    case 'SLEEP_LOGGED':
      return `${emoji} Logged ${event.payload.hours} hours of sleep. Rest well!`
    case 'SET_COMPLETED':
      return `${emoji} Nice! Logged ${event.payload.reps} reps of ${event.payload.exercise} at ${event.payload.weight}${event.payload.unit}.`
    case 'WORKOUT_COMPLETED':
      if (event.payload.distance) {
        return `${emoji} Great workout! Logged ${event.payload.distance} ${event.payload.unit} of ${event.payload.exercise}.`
      } else if (event.payload.duration) {
        return `${emoji} Good workout! Logged ${event.payload.duration} ${event.payload.unit} of ${event.payload.exercise}.`
      } else if (event.payload.reps) {
        return `${emoji} Logged ${event.payload.reps} reps of ${event.payload.exercise}.`
      }
      return `${emoji} Logged your workout.`
    case 'MOOD_LOGGED':
      return `${emoji} Noted you're feeling ${event.payload.mood}. Thanks for sharing!`
    case 'HABIT_COMPLETED':
      return `${emoji} Marked '${event.payload.habit}' as complete. Keep it up!`
    case 'JOB_APPLIED':
      const company = event.payload.company || 'Unknown company'
      const role = event.payload.role || event.payload.position || ''
      return `${emoji} Logged job application${role ? ` for ${role}` : ''} at ${company}. Good luck!`
    case 'JOB_FOUND':
      if (event.payload?.incomplete) {
        return `${emoji} I can help you track this job! Please share the company name, role, and a link if you have one.`
      }
      return `${emoji} Logged ${event.payload.count || 1} job${(event.payload.count || 1) > 1 ? 's' : ''} found.`
    case 'JOB_INTERVIEW':
      return `${emoji} Logged interview${event.payload.role ? ` for ${event.payload.role}` : ''} at ${event.payload.company}. Good luck!`
    case 'JOB_OFFER':
      return `${emoji} ${event.payload.status === 'ACCEPTED' ? 'Congratulations!' : event.payload.status === 'DECLINED' ? 'Noted.' : 'Logged offer'} from ${event.payload.company}${event.payload.salary ? ` (${event.payload.salary})` : ''}.`
    case 'EXPENSE_LOGGED':
      return `${emoji} Logged expense of ${event.payload.currency || 'USD'} ${event.payload.amount}${event.payload.category ? ` for ${event.payload.category}` : ''}.`
    case 'INCOME_LOGGED':
      return `${emoji} Logged income of ${event.payload.currency || 'USD'} ${event.payload.amount}.`
    case 'TASK_COMPLETED':
    case 'PROJECT_COMPLETED':
      const count = event.payload.count ? `${event.payload.count} ` : ''
      const type = event.payload.type || 'tasks'
      return `${emoji} Nice work! Logged ${count}${type}.`
    case 'FOCUS_SESSION':
      return `${emoji} Great focus session! Logged ${event.payload.duration} ${event.payload.unit} of deep work.`
    case 'COURSE_STARTED':
      return `${emoji} Started ${event.payload.type.toLowerCase()}: ${event.payload.title}. Keep learning!`
    case 'BOOK_READ':
    case 'COURSE_COMPLETED':
      return `${emoji} ${event.payload.type === 'BOOK' ? 'Finished reading' : 'Completed'} ${event.payload.title}${event.payload.pages ? ` (${event.payload.pages} pages)` : ''}. Well done!`
    case 'SYMPTOM_LOGGED':
      return `${emoji} Logged symptom: ${event.payload.symptom}. Feel better soon!`
    case 'MEDICATION_TAKEN':
      return `${emoji} Logged medication: ${event.payload.medication}${event.payload.condition ? ` for ${event.payload.condition}` : ''}.`
    case 'VITAL_LOGGED':
      return `${emoji} Logged ${event.payload.type}: ${event.payload.value} ${event.payload.unit}.`
    case 'SOBRIETY_LOGGED':
      const days = event.payload.days ? ` (Day ${event.payload.days})` : ''
      return `${emoji} ${event.payload.status === 'sober' ? `Great job staying sober${days}!` : event.payload.status === 'craving' ? `Hang in there${days}. You've got this!` : 'Noted. Take care of yourself.'}`
    case 'ROUTINE_CHECKED':
      return `${emoji} Marked ${event.payload.routine} routine as ${event.payload.status}.`
    default:
      return `${emoji} Got it! I've logged that for you.`
  }
}