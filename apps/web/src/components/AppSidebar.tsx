/**
 * App Sidebar Component
 * Reusable sidebar for app preview using shadcn sidebar components
 */
import * as React from "react"
import {
  LayoutDashboard,
  List,
  FormInput,
  Calendar,
  Kanban,
  FileText,
  User,
  ChevronUp,
  Settings,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Page {
  id: string
  name: string
  route?: string
  type?: string
  components?: unknown[]
}

interface AppSidebarProps {
  appName: string
  pages: Page[]
  currentPageId: string | null
  onPageSelect: (pageId: string) => void
  onNavigateHome?: () => void
  showUserMenu?: boolean
}

// Get icon for page type
function getPageIcon(type: string | undefined) {
  switch (type) {
    case 'dashboard':
      return LayoutDashboard
    case 'list':
      return List
    case 'form':
      return FormInput
    case 'calendar':
      return Calendar
    case 'kanban':
      return Kanban
    default:
      return FileText
  }
}

export function AppSidebar({
  appName,
  pages,
  currentPageId,
  onPageSelect,
  onNavigateHome,
  showUserMenu = true,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-sm font-semibold">
                  {appName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{appName}</span>
                <span className="truncate text-xs text-muted-foreground">Preview</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pages.map((page) => {
                const Icon = getPageIcon(page.type)
                const isActive = page.id === currentPageId
                return (
                  <SidebarMenuItem key={page.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onPageSelect(page.id)}
                      tooltip={page.name}
                    >
                      <Icon className="size-4" />
                      <span>{page.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {showUserMenu && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-accent">
                      <User className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">User</span>
                      <span className="truncate text-xs text-muted-foreground">Guest</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem>
                    <Settings className="mr-2 size-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {onNavigateHome && (
                    <DropdownMenuItem onClick={onNavigateHome}>
                      <LogOut className="mr-2 size-4" />
                      Back to Neo
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      
      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
