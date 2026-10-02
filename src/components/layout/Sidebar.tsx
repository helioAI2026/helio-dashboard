import { NavLink } from "react-router-dom";
import { Activity, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { navGroups } from "@/config/nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-[18px]" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Helio</p>
            <p className="kicker">Painel da frota</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="kicker px-2 pb-1.5">{group.label}</p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          )
                        }
                      >
                        <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Ambiente de demonstração · dados simulados
          </p>
        </div>
      </aside>
    </>
  );
}
