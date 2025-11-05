// Seed preset domains for new users

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const presetDomains = [
  {
    name: "HABIT",
    type: "PRESET",
    order: 0,
    icon: "check-circle",
    color: "#3b82f6",
    schema: {
      fields: [
        { id: "habit_id", name: "Habit", type: "text", required: true },
        { id: "value", name: "Value", type: "number", required: false },
        { id: "unit", name: "Unit", type: "text", required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: null },
    },
  },
  {
    name: "WELLNESS",
    type: "PRESET",
    order: 1,
    icon: "heart",
    color: "#10b981",
    schema: {
      fields: [
        { id: "kind", name: "Type", type: "select", options: ["WATER", "SLEEP", "MOOD", "NUTRITION"], required: true },
        { id: "value", name: "Value", type: "number", required: false },
        { id: "unit", name: "Unit", type: "text", required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: "kind" },
    },
  },
  {
    name: "WORKOUT",
    type: "PRESET",
    order: 2,
    icon: "dumbbell",
    color: "#f59e0b",
    schema: {
      fields: [
        { id: "exercise", name: "Exercise", type: "text", required: true },
        { id: "weight_kg", name: "Weight (kg)", type: "number", required: false },
        { id: "reps", name: "Reps", type: "number", required: false },
        { id: "rpe", name: "RPE", type: "number", min: 1, max: 10, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: "exercise" },
    },
  },
  {
    name: "JOBS",
    type: "PRESET",
    order: 3,
    icon: "briefcase",
    color: "#8b5cf6",
    schema: {
      fields: [
        { id: "company", name: "Company", type: "text", required: true },
        { id: "role", name: "Role", type: "text", required: true },
        { id: "stage", name: "Stage", type: "select", options: ["Applied", "Screen", "Interview", "Offer", "Rejected", "Hold"], required: true },
        { id: "salary", name: "Salary", type: "number", required: false },
        { id: "notes", name: "Notes", type: "text", multiline: true, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
        { id: "by_stage", name: "By Stage", type: "table", filters: [], sorts: [{ field: "stage", direction: "asc" }] },
      ],
      display: { defaultView: "default", groupBy: "stage" },
    },
  },
  {
    name: "SOBRIETY",
    type: "PRESET",
    order: 4,
    icon: "shield",
    color: "#ef4444",
    schema: {
      fields: [
        { id: "substance", name: "Substance", type: "text", required: false },
        { id: "status", name: "Status", type: "select", options: ["sober", "craving", "relapsed"], required: true },
        { id: "craving", name: "Craving Level", type: "number", min: 1, max: 10, required: false },
        { id: "notes", name: "Notes", type: "text", multiline: true, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: null },
    },
  },
  {
    name: "ROUTINE",
    type: "PRESET",
    order: 5,
    icon: "repeat",
    color: "#06b6d4",
    schema: {
      fields: [
        { id: "routine_id", name: "Routine", type: "text", required: true },
        { id: "status", name: "Status", type: "select", options: ["completed", "skipped", "partial"], required: true },
        { id: "notes", name: "Notes", type: "text", multiline: true, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: "routine_id" },
    },
  },
  {
    name: "FINANCES",
    type: "PRESET",
    order: 6,
    icon: "dollar-sign",
    color: "#22c55e",
    schema: {
      fields: [
        { id: "category", name: "Category", type: "text", required: false },
        { id: "amount", name: "Amount", type: "number", required: true },
        { id: "type", name: "Type", type: "select", options: ["INCOME", "EXPENSE"], required: true },
        { id: "notes", name: "Notes", type: "text", multiline: true, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: "type" },
    },
  },
  {
    name: "LEARNING",
    type: "PRESET",
    order: 7,
    icon: "book",
    color: "#a855f7",
    schema: {
      fields: [
        { id: "type", name: "Type", type: "select", options: ["COURSE", "BOOK", "SKILL"], required: true },
        { id: "title", name: "Title", type: "text", required: true },
        { id: "progress", name: "Progress", type: "number", min: 0, max: 100, required: false },
        { id: "notes", name: "Notes", type: "text", multiline: true, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: "type" },
    },
  },
  {
    name: "PRODUCTIVITY",
    type: "PRESET",
    order: 8,
    icon: "zap",
    color: "#eab308",
    schema: {
      fields: [
        { id: "type", name: "Type", type: "select", options: ["TASK", "POMODORO", "FOCUS"], required: true },
        { id: "duration", name: "Duration (min)", type: "number", required: false },
        { id: "notes", name: "Notes", type: "text", multiline: true, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: "type" },
    },
  },
  {
    name: "HEALTH",
    type: "PRESET",
    order: 9,
    icon: "activity",
    color: "#ec4899",
    schema: {
      fields: [
        { id: "type", name: "Type", type: "select", options: ["SYMPTOM", "MEDICATION", "VITAL"], required: true },
        { id: "value", name: "Value", type: "number", required: false },
        { id: "unit", name: "Unit", type: "text", required: false },
        { id: "notes", name: "Notes", type: "text", multiline: true, required: false },
      ],
      views: [
        { id: "default", name: "Default", type: "table", filters: [], sorts: [] },
      ],
      display: { defaultView: "default", groupBy: "type" },
    },
  },
]

async function main() {
  console.log("Seeding preset domains...")
  
  // This seed script should be run per user, not globally
  // It's a template for creating preset domains for new users
  console.log("Preset domains template ready.")
  console.log("Run this seed function when creating a new user.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
