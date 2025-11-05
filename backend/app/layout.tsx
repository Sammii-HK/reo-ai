import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reo API",
  description: "Backend API for Reo - Conversational Life Tracker",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
