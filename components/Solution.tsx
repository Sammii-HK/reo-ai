export function Solution() {
  return (
    <section className="px-4 py-16 md:py-24 bg-blue-50/30">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-12 text-center">
          With Reo
        </h2>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-6">
            <div>
              <p className="text-lg font-medium mb-2">With Reo</p>
              <div className="space-y-4 text-muted-foreground">
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <p className="font-mono text-sm">"I drank 100 ml water."</p>
                  <p className="text-xs mt-1">→ logged.</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <p className="font-mono text-sm">"50 kg squat × 20 reps."</p>
                  <p className="text-xs mt-1">→ tracked.</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <p className="font-mono text-sm">"Applied to Stripe."</p>
                  <p className="text-xs mt-1">→ added to job table.</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <p className="font-mono text-sm">"Reo asks, you answer — done."</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-lg font-medium mb-2">Without Reo</p>
              <div className="space-y-4 text-muted-foreground">
                <div className="p-4 bg-white rounded-lg border border-gray-200 opacity-60">
                  <p className="text-sm">Manual taps and dropdowns.</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-gray-200 opacity-60">
                  <p className="text-sm">Separate app for workouts.</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-gray-200 opacity-60">
                  <p className="text-sm">Spreadsheet juggling.</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-gray-200 opacity-60">
                  <p className="text-sm">You chase motivation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
