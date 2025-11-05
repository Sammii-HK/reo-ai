# Feature Status & Missing Items

## ✅ What's Working

### Backend
- ✅ User authentication (Supabase)
- ✅ `/api/ingest` - Natural language parsing
- ✅ `/api/summary` - Daily/weekly summaries
- ✅ `/api/metrics` - Metrics retrieval
- ✅ `/api/domains` - CRUD for domains
- ✅ Auto-create preset domains on signup
- ✅ NLU parser (heuristics + LLM fallback)
- ✅ Event sourcing system
- ✅ Domain-specific log tables (partial)

### Mobile App
- ✅ Authentication flow
- ✅ Chat screen with conversational input
- ✅ Home screen with summary and metrics
- ✅ Domains screen (view only)
- ✅ API client integration

## ⚠️ Issues Found

### 1. Domain Name Mismatch
- **Problem**: Preset domain is named `"JOBS"` but parser outputs `"CAREER"`
- **Impact**: Job applications won't be properly linked to the domain
- **Fix Needed**: Standardize to one name (suggest `"JOBS"` to match preset)

### 2. Missing Domain Handlers
The ingest endpoint only handles 4 domains, but we have 10 preset domains:

**Currently Handled:**
- ✅ WELLNESS (water, sleep, mood)
- ✅ WORKOUT (sets)
- ✅ HABIT (completions)
- ✅ CAREER (job applications)

**Missing Handlers:**
- ❌ SOBRIETY
- ❌ ROUTINE
- ❌ FINANCES (FINANCE in parser)
- ❌ LEARNING
- ❌ PRODUCTIVITY
- ❌ HEALTH

**Impact**: Events for these domains are created but don't populate domain-specific log tables.

### 3. Missing Parser Patterns
The heuristics parser only handles:
- ✅ Water intake
- ✅ Sleep
- ✅ Workouts
- ✅ Mood
- ✅ Habits
- ✅ Job applications

**Missing:**
- ❌ Finance/expense tracking
- ❌ Learning progress
- ❌ Productivity/pomodoro
- ❌ Health symptoms
- ❌ Sobriety tracking
- ❌ Routine checks

## 🚧 Missing Features

### High Priority

1. **Domain Management UI**
   - ❌ Edit domain settings
   - ❌ Reorder domains (drag & drop)
   - ❌ Enable/disable domains
   - ❌ Custom domain creation from UI
   - ❌ Domain schema editing

2. **Domain-Specific Views**
   - ❌ View data in table format per domain
   - ❌ Filter and sort
   - ❌ Group by fields
   - ❌ Custom views (as defined in schema)

3. **Missing Domain Handlers**
   - ❌ Add `createDomainLog` handlers for all 10 domains
   - ❌ Fix domain name consistency (JOBS vs CAREER)

4. **Enhanced Parser Patterns**
   - ❌ Add heuristics for finance, learning, productivity, health, sobriety, routines

### Medium Priority

5. **Voice Input**
   - ❌ Speech-to-text (Whisper)
   - ❌ Audio recording UI
   - ❌ Audio upload to backend

6. **Visualizations**
   - ❌ Charts for metrics
   - ❌ Trends over time
   - ❌ Progress graphs

7. **Advanced Features**
   - ❌ Weekly/monthly summary views
   - ❌ Export data
   - ❌ Data import
   - ❌ Reminders/notifications

### Low Priority

8. **Polish**
   - ❌ Better error messages
   - ❌ Loading states
   - ❌ Empty states
   - ❌ Settings screen
   - ❌ Profile management

## 🔧 Quick Fixes Needed

1. **Fix domain name mismatch**
   ```typescript
   // Change parser to use "JOBS" instead of "CAREER"
   // OR change preset domain to "CAREER"
   ```

2. **Add missing domain handlers**
   ```typescript
   // Add cases for: SOBRIETY, ROUTINE, FINANCES, LEARNING, PRODUCTIVITY, HEALTH
   ```

3. **Add more parser patterns**
   ```typescript
   // Add heuristics for missing domains
   ```

## 📊 Domain Coverage

| Domain | Preset | Parser | Handler | Status |
|--------|--------|--------|---------|--------|
| HABIT | ✅ | ✅ | ✅ | ✅ Complete |
| WELLNESS | ✅ | ✅ | ✅ | ✅ Complete |
| WORKOUT | ✅ | ✅ | ✅ | ✅ Complete |
| JOBS | ✅ | ⚠️ (CAREER) | ⚠️ (CAREER) | ⚠️ Name mismatch |
| SOBRIETY | ✅ | ✅ (LLM) | ❌ | ❌ No handler |
| ROUTINE | ✅ | ✅ (LLM) | ❌ | ❌ No handler |
| FINANCES | ✅ | ✅ (LLM) | ❌ | ❌ No handler |
| LEARNING | ✅ | ✅ (LLM) | ❌ | ❌ No handler |
| PRODUCTIVITY | ✅ | ✅ (LLM) | ❌ | ❌ No handler |
| HEALTH | ✅ | ✅ (LLM) | ❌ | ❌ No handler |

## 🎯 Recommended Next Steps

1. **Fix domain name mismatch** (5 min)
2. **Add missing domain handlers** (30 min)
3. **Add more parser patterns** (1 hour)
4. **Build domain management UI** (2-3 hours)
5. **Add domain-specific views** (3-4 hours)

