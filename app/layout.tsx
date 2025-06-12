import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AI Voice Assistant",
  description: "An embeddable AI voice assistant with vision capabilities",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>

        {/* AI Voice Assistant - Embeddable Widget */}
        <Script
          src="/assistant-loader.js"
          strategy="afterInteractive"
          data-iframe-url="https://ai-voice-assistant-nu.vercel.app/"
          data-initially-visible="false"
          data-theme="gradient"
          data-primary-color="#ffffff"
          data-secondary-color="#d9d9d9"
          data-icon-style="microphone"
          data-position="right"
          data-width="400px"
          data-height="600px"
          data-draggable-icon="true"
          data-keyboard-shortcut="a"
          data-show-header="true"
          data-animation-style="slide-up"
          data-animation-duration="0.5s"
          data-mobile-fullscreen="false"
        />

        {/* Helper script for action execution */}
        <Script
          src="/assistant-helper.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
