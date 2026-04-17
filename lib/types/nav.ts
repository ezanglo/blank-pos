/** Sidebar store switcher item (client + server safe). */
export type SidebarStoreNavItem = {
  organizationId: string
  slug: string
  label: string
  logoUrl?: string | null
  dashboardHref: string
}
