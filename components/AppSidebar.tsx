"use client";

import {
  Home,
  Settings,
  ChevronDown,
  Users,
  MapPin,
  Shield,
  ShieldUser,
  LockKeyhole,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AppSidebar() {
  const pathname = usePathname();
  const pathParam = useParams<{ tenantId: string }>();
  const tenantId = pathParam.tenantId;

  // Récupère isMobile et setOpenMobile depuis le contexte
  const { isMobile, setOpenMobile } = useSidebar();

  // ⬇️ LE SEUL useEffect : ferme la sidebar mobile quand la route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  // ========================= // Menu items // =========================
  const mainItems = [
    {
      title: "Accueil",
      url: "/",
      icon: Home,
      description: "Tableau de bord principal",
    },
  ];

  const configItems = {
    title: "Configurations",
    icon: Settings,
    list: [
      { title: "Sites", url: `/sites`, icon: MapPin, description: "Gérer les sites" },
      { title: "Utilisateurs", url: `/users`, icon: Users, description: "Gérer les utilisateurs" },
    ],
  };

  const AccessControl = {
    title: "Contrôle d'accès",
    icon: LockKeyhole,
    list: [
      { title: "Rôles", url: `/roles`, icon: Shield, description: "Gérer les rôles" },
      { title: "Permissions", url: `/permissions`, icon: ShieldUser, description: "Gérer les permissions" },
    ],
  };

  const allItems = [configItems, AccessControl];

  // ========================= // Active path // =========================
  const getFullUrl = (url: string) => (url === "/" ? "/" : `/${tenantId}${url}`);
  const isActivePath = (url: string) => pathname === getFullUrl(url);

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Liens principaux */}
              {mainItems.map((item) => {
                const isActive = isActivePath(item.url);
                return (
                  <SidebarMenuItem key={item.title} className="my-2">
                    <SidebarMenuButton
                      asChild
                      tooltip={item.description}
                      isActive={isActive}
                      className={cn(
                        "transition-all duration-200 hover:bg-accent",
                        isActive && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                        {isActive && (
                          <div className="ml-auto w-1 h-4 bg-primary rounded-full group-data-[collapsible=icon]:hidden" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <hr className="my-2 border-border group-data-[collapsible=icon]:hidden" />

              {/* Groupes repliables */}
              {allItems.map((theItem) => (
                <Collapsible
                  key={theItem.title}
                  className="group/collapsible"
                  defaultOpen={false}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="w-full justify-between hover:bg-accent transition-all duration-200"
                        tooltip={theItem.title}
                      >
                        <div className="flex items-center gap-2">
                          <theItem.icon className="w-4 h-4 shrink-0" />
                          <span className="transition-all duration-200 group-data-[collapsible=icon]:hidden">
                            {theItem.title}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="CollapsibleContent group-data-[collapsible=icon]:hidden">
                      <SidebarMenuSub className="mt-1">
                        <SidebarMenuSubItem>
                          {theItem.list.map((item) => {
                            const isActive = isActivePath(item.url);
                            return (
                              <SidebarMenuButton
                                key={item.title}
                                asChild
                                isActive={isActive}
                                className={cn(
                                  "pl-4 transition-all duration-200 hover:bg-accent mb-1",
                                  isActive && "bg-accent text-accent-foreground font-medium"
                                )}
                                tooltip={item.description}
                              >
                                <Link href={`/${pathParam?.tenantId}` + item.url}>
                                  <item.icon className="w-4 h-4 shrink-0" />
                                  <span>{item.title}</span>
                                  {isActive && (
                                    <div className="ml-auto w-1 h-3 bg-primary rounded-full" />
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            );
                          })}
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}