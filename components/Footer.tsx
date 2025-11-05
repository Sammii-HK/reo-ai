export function Footer() {
  return (
    <footer className="px-4 py-12 md:py-16 bg-white border-t border-gray-200">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Reo</p>
            <p className="text-xs">Currently in private beta.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Twitter/X
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Indie Hackers
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
