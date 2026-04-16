export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">{children}</div>
    </div>
  )
}
