"use client"

import { WaitlistForm } from "@/components/WaitlistForm"

export function Hero() {
  return (
    <section className="relative px-4 py-20 md:py-32 lg:py-40">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          Reo
        </h1>
        <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-8 font-light">
          Your life in flow.
        </p>
        <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
          Talk, type, or whisper — Reo listens and keeps track.
        </p>
        <p className="text-base md:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
          No dashboards. No checkboxes. Just one calm conversation that remembers everything.
        </p>
        <WaitlistForm />
        <p className="text-sm text-muted-foreground mt-6 max-w-xl mx-auto">
          Be the first to try Reo, the AI assistant that helps you build better habits, track progress, and stay balanced — effortlessly.
        </p>
      </div>
    </section>
  )
}
