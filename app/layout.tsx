import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { getAnyStoreBrandingForPublicSite } from "@/lib/queries/store-branding"
import { buildRootMetadataFromBranding } from "@/lib/seo"
import { cn } from "@/lib/utils"
import "./globals.css"

export async function generateMetadata(): Promise<Metadata> {
  try {
    const branding = await getAnyStoreBrandingForPublicSite()
    return buildRootMetadataFromBranding(branding)
  } catch {
    return buildRootMetadataFromBranding(null)
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
}

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
