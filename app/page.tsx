import { Hero } from "@/components/Hero"
import { Problem } from "@/components/Problem"
import { Solution } from "@/components/Solution"
import { Features } from "@/components/Features"
import { Footer } from "@/components/Footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50/30">
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <Footer />
    </main>
  )
}
