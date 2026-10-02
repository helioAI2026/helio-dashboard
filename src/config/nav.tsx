import {
  Boxes,
  Cpu,
  GraduationCap,
  LayoutDashboard,
  Map,
  Rocket,
  Settings,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Visão geral", to: "/", icon: LayoutDashboard, end: true },
      { label: "Mapa da frota", to: "/mapa", icon: Map },
      { label: "Alertas", to: "/alertas", icon: TriangleAlert },
    ],
  },
  {
    label: "Frota",
    items: [
      { label: "Motoristas", to: "/motoristas", icon: Users },
      { label: "Dispositivos", to: "/dispositivos", icon: Cpu },
    ],
  },
  {
    label: "Modelo de IA",
    items: [
      { label: "Versões do modelo", to: "/ml/modelos", icon: Boxes },
      { label: "Treinamentos", to: "/ml/treinamentos", icon: GraduationCap },
      { label: "Implantação", to: "/ml/implantacao", icon: Rocket },
    ],
  },
  {
    label: "Sistema",
    items: [{ label: "Configurações", to: "/configuracoes", icon: Settings }],
  },
];
