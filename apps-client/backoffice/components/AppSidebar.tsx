import { NavLink } from 'react-router'

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
import {
  ChevronsUpDownIcon,
  ChevronUp,
  Facebook,
  Handshake,
  Newspaper,
  PieChart,
} from 'lucide-react'

import { GetAuthMeResponse } from '@api/backoffice/admin'

import { userManager } from '~/config/oidc'

import { SidebarUser } from './SidebarUser'

const logout = () => {
  Promise.all([userManager.revokeTokens(), userManager.removeUser()])
    .then(() => window.location.reload())
    .catch((err) => {
      console.log(err)
    })
}

export const AppSidebar = ({
  authMe,
  children,
}: {
  authMe: GetAuthMeResponse
  children: React.ReactNode
}) => {
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
                    <NavLink to="/">
                      <PieChart />
                      <span>Dashboard</span>
                    </NavLink>
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
                            <NavLink to="/feed/hashtag">Hashtag</NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/feed/topic">Topic</NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/feed/announcement">Announcement</NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/feed/post">Post</NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/feed/banner">Banner</NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="#">
                      <Facebook />
                      <span>เพจเฟสบุ๊ค</span>
                    </a>
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
                          <SidebarMenuSubButton>เเบบสอบถาม</SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/activity/internal-election">Internal Election</NavLink>
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
                    <NavLink to="/banner-test">Banner Test</NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <NavLink to="/facebook">Facebook</NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <NavLink to="/file-test">File Test</NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <NavLink to="/playground">Playground</NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuButton asChild>
                    <NavLink to="/sso">SSO</NavLink>
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
                title={authMe.name ?? 'undefined'}
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
