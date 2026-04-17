/** Sidebar business switcher item (client + server safe). */
export type SidebarBusinessNavItem = {
  organizationId: string
  slug: string
  label: string
  logoUrl?: string | null
  dashboardHref: string
}
