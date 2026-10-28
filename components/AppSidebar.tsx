"use client";

import {
  Home,
  Settings,
  ChevronDown,
  Users,
  Upload,
  MapPin,
  Shield,
  ShieldUser,
  LockKeyhole,
  Truck,
  FolderCog2Icon,
  CalendarCheck,
  Ungroup,
  NotepadText,
  BookOpenCheck,
  Boxes,
  Wrench, Gauge, ClipboardList,
  BarChart3,
  Droplet,
  Droplets,
  Target,
  Server,
  UserStar,
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
import { JSX, useEffect } from "react";


// Hook personnalisé pour la navigation active
import { usePathname } from "next/navigation";
import { useCurrentLocale } from "@/locales/client";

function useActivePath(): (url: string) => boolean {
  const pathname = usePathname();

  return (url: string) => {
    if (url === "/") {
      return pathname === "/";
    }
    return pathname === url;
  };
}

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
    {
      title: "Types de parcs",
      url: "/typeparcs",
      icon: Boxes,
      description: "Gérer les types de parcs",
    }, {
      title: "Parcs",
      url: "/parcs",
      icon: Truck,
      description: "Gérer les parcs",
    }, {
      title: "Engins",
      url: "/engins",
      icon: Truck,
      description: "Gérer les engins",
    }, {
      title: "Objectifs",
      url: "/objectifs",
      icon: Target,
      description: "Gérer les objectifs",
    }, {
      title: "Types de pannes",
      url: "/typepannes",
      icon: Wrench,
      description: "Gérer les types de pannes",
    }, {
      title: "Pannes",
      url: "/pannes",
      icon: Wrench,
      description: "Gérer les pannes",
    },

    {
      title: "lubrifiant",
      url: "/lubrifiant",
      icon: Droplet,
      description: "Gérer les lubrifiants",
    },
    {
      title: "Type de lubrifiant",
      url: "/type_lubrifiant",
      icon: Droplets,
      description: "Gérer les type des lubrifiants",
    },

    { title: "Utilisateurs", url: `/users`, icon: Users, description: "Gérer les utilisateurs" },
    { title: "Import", url: `/import`, icon: Upload, description: "Import" },
  ],
};

const rapportsItems = {
  title: "Rapports",
  icon: FolderCog2Icon,

  list: [
    {
      title: "RJE",
      url: "/rapports/rje",
      icon: CalendarCheck,
      description: "RJE",
    },
    {
      title: "Unité physique",
      url: "/rapports/unite-physique",
      icon: Ungroup,
      description: "Unité physique",
    },
    {
      title: "Etat Mensuel",
      url: "/rapports/etat-mensuel",
      icon: NotepadText,
      description: "Etat Mensuel",
    },
    {
      title: "Analyse Indispo",
      url: "/rapports/analyse-indispo-parc",
      icon: BookOpenCheck,
      description: "analyse-indispo",
    },
    {
      title: "Etat Général",
      url: "/rapports/etat-general",
      icon: Boxes,
      description: "etat-general",
    },
    {
      title: "Paretos",
      url: "/rapports/pareto",
      icon: BarChart3,
      description: "Paretos",
    },
  ],
};

const backlogItems = {
  title: "Gestion des backlogs",
  icon: Wrench,
  list: [
    {
      title: "Dashboard",
      url: "/backlogs/stats",
      icon: Gauge,
      description: "Dashboard",
    },
    {
      title: "Backlogs",
      url: "/backlogs",
      icon: Wrench,
      description: "Gestion des backlogs",
    },
  ],
};

const SuiviPerformances = {
  title: "Suivi des performances",
  icon: UserStar,
  list: [
    {
      title: "Saisies HRM",
      url: "/saisie-hrm",
      icon: Gauge,
      description: "Consulter, filtrer et modifier les saisies HRM",
    }, {
      title: "Saisies HIM",
      url: "/saisie-him",
      icon: ClipboardList,
      description: "Gérer les saisies HIM",
    },
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

const superAdmin = {
  title: "Super Admin",
  icon: UserStar,
  list: [
    { title: "Backups", url: `/database-backups`, icon: Server, description: "Gérer les backups" },
  ],
};

const maintenancePreventiveItems = {
  title: "Maintenance préventive",
  icon: CalendarCheck,
  list: [
    {
      title: "Plans de maintenance",
      url: "/maintenance-preventive/plans",
      icon: ClipboardList,
      description: "Gérer les plans de maintenance préventive",
    }, {
      title: "Affectations",
      url: "/maintenance-preventive/affectations",
      icon: ClipboardList,
      description: "Gérer les affectations des plans de maintenance",
    }, {
      title: "Échéances",
      url: "/maintenance-preventive/echeances",
      icon: CalendarCheck,
      description: "Consulter les échéances de maintenance préventive",
    }, {
      title: "Historique",
      url: "/maintenance-preventive/historique",
      icon: ClipboardList,
      description: "Consulter l'historique des maintenances réalisées",
    },
  ],
};


export function AppSidebar(): JSX.Element {
  const locale = useCurrentLocale();
  const isRTL = locale === "ar";

  const { isMobile, setOpenMobile } = useSidebar();
  // ⬇️ LE SEUL useEffect : ferme la sidebar mobile quand la route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);



  const isActivePath = useActivePath();

  const allItems = [
    rapportsItems,
    backlogItems,
    maintenancePreventiveItems,
    SuiviPerformances,
    configItems,
    AccessControl,
    superAdmin,
  ];

  return (
    <Sidebar side={isRTL ? "right" : "left"} variant="floating" collapsible="icon">
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
                                <Link href={item.url}>
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