import type { LucideIcon } from "lucide-react";
import {
  Users,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orcamentos", label: "Orçamentos", icon: ClipboardList },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/materiais", label: "Materiais", icon: Package },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
