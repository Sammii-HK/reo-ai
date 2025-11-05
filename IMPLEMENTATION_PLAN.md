# Reo: Full Feature Implementation Plan

## Executive Summary

**Recommendation: Keep in-house** ✅

You've already built the hardest parts:
- ✅ Custom NLU parser (Notion doesn't have this)
- ✅ Event-sourced architecture
- ✅ Conversational input system
- ✅ Schema system for custom domains
- ✅ Domain-specific log tables

**Estimated Work: 7-10 weeks for full feature set**

---

## Current State Assessment

### ✅ What's Working
1. **Backend**: Solid foundation with event sourcing
2. **NLU Parser**: Comprehensive (covers all 10 domains)
3. **Mobile App**: Basic UI structure exists
4. **API**: All endpoints functional

### ⚠️ What Needs Work
1. **NLU Coverage**: Missing TODO/LIST generic support
2. **Category Detail Pages**: Basic, needs Notion-like views
3. **Daily Input Page**: Doesn't exist yet
4. **Template Editing**: Not implemented
5. **Smart Prompting**: Basic, needs enhancement

---

## Phase 1: Core Functionality (Weeks 1-3)

### 1.1 Complete NLU Coverage
- [x] Add TODO/LIST domain support
- [x] Verify all schema fields are parseable
- [x] Add list/todo patterns to parser

**Status**: NLU parser is comprehensive. Just need to add TODO domain.

### 1.2 Enhanced Category Detail Pages
**Current**: Basic list view
**Needed**: Notion-like table view

**Features**:
- Table view with columns matching schema fields
- Group by (e.g., by exercise, by date, by stage)
- Filter and sort
- Click rows to edit
- Add new entries inline

**Files to modify**:
- `mobile/app/(app)/domains/[domainId].tsx` - Complete rewrite
- New component: `mobile/components/DomainTable.tsx`
- New component: `mobile/components/NotionLikeView.tsx`

### 1.3 Daily Input Page
**New page**: `mobile/app/(app)/daily.tsx`

**Features**:
- Quick inputs for all enabled categories
- Smart defaults (today's date, last values)
- Voice input per field
- Dropdowns for selects
- Number inputs with units
- Smart suggestions based on history

**Layout**:
```
Daily Log
├── Quick Actions (Water, Sleep, Mood buttons)
├── Wellness
│   ├── Water: [___] ml [Log]
│   ├── Sleep: [___] hours [Log]
│   └── Mood: [😊😐😢] [Log]
├── Workout
│   ├── Exercise: [dropdown] Weight: [___] Reps: [___] [Log]
│   └── Cardio: [Running] Distance: [___] [Log]
├── Jobs
│   └── [Add Job] button → Modal
└── ... (all enabled categories)
```

---

## Phase 2: Smart UI & Template Editing (Weeks 4-7)

### 2.1 Template/Schema Editor
**New page**: `mobile/app/(app)/domains/[domainId]/edit.tsx`

**Features**:
- Add/remove fields
- Change field types (text, number, select, date, etc.)
- Edit field options (for selects)
- Set required fields
- Reorder fields
- Change default view
- Add custom views

**Schema structure** (already exists in `Domain.schema`):
```json
{
  "fields": [
    { "id": "name", "name": "Name", "type": "text", "required": true },
    { "id": "status", "type": "select", "options": ["todo", "done"] }
  ],
  "views": [
    { "id": "default", "type": "table", "filters": [], "sorts": [] }
  ]
}
```

### 2.2 Smart Prompting System
**Enhance**: `mobile/app/(app)/chat.tsx`

**Features**:
- Context-aware suggestions
- "What did you do today?" → Shows today's empty categories
- "Log water" → Prompts for amount
- "I worked out" → Asks for exercise details
- Smart autocomplete based on history
- Predictive text for common entries

**Implementation**:
- Store recent entries per domain
- Use LLM to generate smart prompts
- Show quick action buttons based on context

### 2.3 Notion-Like Data Display
**New component**: `mobile/components/NotionLikeView.tsx`

**Features**:
- Multiple view types: Table, Board (Kanban), Calendar, List
- Drag-and-drop reordering
- Inline editing
- Rich text notes
- Tags/labels
- Grouping and filtering
- Custom properties

**Views**:
1. **Table**: Traditional spreadsheet view
2. **Board**: Kanban (group by stage/status)
3. **Calendar**: Timeline view
4. **List**: Simple list with checkboxes

---

## Phase 3: Advanced Features (Weeks 8-10)

### 3.1 Generic List/Todo Support
**New domain type**: `LISTS` or generic support

**Features**:
- Create any list type (Todo, Shopping, Goals, etc.)
- Schema is user-defined
- Standard fields: title, status, due date, tags
- Can be nested/categorized

**Implementation**:
- Add `LISTS` to preset domains
- NLU patterns for todos: "add todo X", "mark X as done"
- Special handling for checklist-style input

### 3.2 Enhanced Voice Input
**Current**: Basic audio upload
**Enhance**: Real-time transcription, voice commands

**Features**:
- Voice commands: "Log water 500ml"
- Continuous listening mode
- Voice confirmation
- Multi-language support

### 3.3 Data Visualization
**New**: Charts and graphs

**Features**:
- Line charts for trends
- Bar charts for comparisons
- Progress indicators
- Heatmaps (e.g., habit streak calendar)

---

## Technical Implementation Details

### New API Endpoints Needed

1. **Domain Schema Update**
   ```
   PUT /api/domains/:id/schema
   Body: { schema: {...} }
   ```

2. **Bulk Entry**
   ```
   POST /api/ingest/bulk
   Body: { entries: [{ domain, type, payload }] }
   ```

3. **Smart Suggestions**
   ```
   GET /api/suggestions?domain=WELLNESS&context=today
   Returns: { suggestions: [...] }
   ```

### New Database Considerations

**No schema changes needed!** Your current schema supports:
- ✅ Custom fields via `Domain.schema` JSON
- ✅ Event sourcing via `Event` table
- ✅ Domain-specific logs

**Optional enhancement**: Add `View` table for saved views
```sql
CREATE TABLE views (
  id TEXT PRIMARY KEY,
  domainId TEXT REFERENCES domains(id),
  name TEXT,
  type TEXT, -- table, board, calendar
  config JSONB,
  userId TEXT
);
```

### Mobile App Components Needed

```
mobile/components/
├── DomainTable.tsx          # Notion-like table view
├── NotionLikeView.tsx       # Main view component
├── DailyInputForm.tsx       # Quick input form
├── SchemaEditor.tsx         # Template editor
├── SmartPrompt.tsx          # Context-aware prompts
├── VoiceInput.tsx           # Enhanced voice input
└── ChartView.tsx            # Data visualization
```

---

## Comparison: In-House vs Notion Integration

### In-House ✅ (Recommended)
**Pros**:
- ✅ Full control over UX
- ✅ Custom NLU parsing (Notion can't do this)
- ✅ Conversational input
- ✅ Domain-optimized tracking
- ✅ No API rate limits
- ✅ Data stays in your system
- ✅ Mobile-first design

**Cons**:
- Requires development time
- Need to maintain UI components

### Notion Integration ❌
**Pros**:
- Existing UI components
- Users might already use Notion

**Cons**:
- ❌ No natural language parsing
- ❌ API rate limits
- ❌ Less control over UX
- ❌ Would need complex sync system
- ❌ Not optimized for mobile
- ❌ Can't do "talk to Notion" feature
- ❌ Would need to duplicate data storage

**Verdict**: Not worth it. You're building something Notion can't do.

---

## Recommended Implementation Order

### Week 1-2: Core Views
1. ✅ Verify NLU parser (already done)
2. Build enhanced category detail pages
3. Add TODO domain support

### Week 3-4: Daily Input
1. Build daily input page
2. Add smart form components
3. Integrate voice input per field

### Week 5-6: Template Editing
1. Build schema editor UI
2. Add field type management
3. Save/load custom templates

### Week 7-8: Smart Prompting
1. Enhance chat with context
2. Add suggestion system
3. Build predictive inputs

### Week 9-10: Polish & Advanced
1. Add Notion-like views (board, calendar)
2. Generic list support
3. Data visualization

---

## Estimated Effort Breakdown

| Feature | Complexity | Time |
|---------|-----------|------|
| Enhanced category pages | Medium | 1 week |
| Daily input page | Medium | 1 week |
| Template editor | High | 2 weeks |
| Smart prompting | Medium | 1 week |
| Notion-like views | High | 2 weeks |
| Generic lists | Low | 3 days |
| Data visualization | Medium | 1 week |
| Polish & testing | - | 1 week |

**Total: ~7-10 weeks** (depending on polish level)

---

## Next Steps

1. **Start with Phase 1**: Build enhanced category pages
2. **Iterate quickly**: Get basic table view working first
3. **User feedback**: Test with real use cases
4. **Prioritize**: Focus on most-used categories first

Would you like me to start implementing Phase 1?

