import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Jaja Kościotrupa Official",
  description: "Platforma do oceny najśmieszniejszych filmów z TikToka i YouTube Shorts",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className="bg-dark">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
