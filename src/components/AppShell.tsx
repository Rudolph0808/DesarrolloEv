import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Factory, LineChart, Database, Droplet, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/plantas", label: "Plants", icon: Factory },
  { to: "/historico", label: "History", icon: LineChart },
  { to: "/costos", label: "Costs", icon: Wallet },
  { to: "/datos", label: "Data", icon: Database },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Droplet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg leading-tight">EnergyOps</div>
            <div className="text-xs text-muted-foreground">Industrial Complex</div>
          </div>
        </div>
        <nav className="px-3 py-2 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-4 text-xs text-muted-foreground">
          <div className="flex gap-2 items-center">
            <span className="h-2 w-2 rounded-full bg-positive" /> Data up to date
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="font-display text-lg">EnergyOps</div>
          <nav className="flex gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "p-2 rounded-md",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground",
                  )}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
