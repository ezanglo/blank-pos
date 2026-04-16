export const dynamic = "force-dynamic"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-background min-h-dvh px-4 py-8">{children}</div>
}
