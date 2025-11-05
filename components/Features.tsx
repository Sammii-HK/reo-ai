import { MessageSquare, Database, Shield, Sparkles, Brain } from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    title: "Conversational tracking",
    description: "Text or voice input.",
  },
  {
    icon: Database,
    title: "Auto-update tables",
    description: "Jobs, wellness, habits, finances.",
  },
  {
    icon: Sparkles,
    title: "Daily reflections",
    description: "Morning and evening summaries.",
  },
  {
    icon: Brain,
    title: "AI memory",
    description: "Remembers context, encourages gently.",
  },
  {
    icon: Shield,
    title: "Privacy-first",
    description: "Your data, your flow.",
  },
]

export function Features() {
  return (
    <section className="px-4 py-16 md:py-24 bg-white">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-12 text-center">
          Features Sneak Peek
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="p-6 bg-blue-50/30 rounded-lg border border-blue-100"
              >
                <Icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
