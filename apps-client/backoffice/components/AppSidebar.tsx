import { Button } from '@pple-today/web-ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@pple-today/web-ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pple-today/web-ui/dropdown-menu'
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from '@pple-today/web-ui/sidebar'
import { Link } from '@tanstack/react-router'
import {
  ChevronsUpDownIcon,
  ChevronUp,
  Facebook,
  Handshake,
  Newspaper,
  PieChart,
} from 'lucide-react'

import { logout, useAuthContext } from '~/core/auth'

import { SidebarUser } from './SidebarUser'

export const AppSidebar = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthContext()
  const user = auth.user!
  return (
    <SidebarProvider>
      <Sidebar collapsible="none">
        <SidebarHeader>
          <SidebarUser
            src="https://picsum.photos/id/64/64"
            title="PPLE Today"
            subtitle="Web Admin"
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>จัดการเนื้อหา</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/dashboard">
                      <PieChart />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <Newspaper />
                        <span>Feed</span>
                        <ChevronUp className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link to="/feed/hashtag">Hashtag</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link to="/feed/topic">Topic</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link to="/feed/announcement">Announcement</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link to="/feed/post">Post</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link to="/feed/banner">Banner</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/facebook">
                      <Facebook />
                      <span>เพจเฟสบุ๊ค</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <Handshake />
                        <span>กิจกรรม</span>
                        <ChevronUp className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton>แบบสอบถาม</SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link to="/activity/internal-election">Internal Election</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>จัดการผู้ใช้งาน</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="#">
                      <PieChart />
                      <span>คะแนน</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="#">
                      <Facebook />
                      <span>ผู้ใช้งาน</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Debugging</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/banner-test">Banner Test</Link>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <Link to="/facebook/old">Facebook</Link>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <Link to="/file-test">File Test</Link>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <Link to="/playground">Playground</Link>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <Link to="/sso">SSO</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarUser
                src="https://picsum.photos/id/64/64"
                title={user.name ?? '-'}
                subtitle="pple_admin@pple.com"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="p-0 size-8 hover:bg-base-bg-medium text-base-text-high group-active:text-base-text-high"
                      variant="ghost"
                      size="icon"
                      aria-label="Open user menu"
                    >
                      <ChevronsUpDownIcon className="shrink-0 size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end">
                    <DropdownMenuItem onClick={logout}>
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarUser>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1 min-w-0">{children}</div>
    </SidebarProvider>
  )
}
