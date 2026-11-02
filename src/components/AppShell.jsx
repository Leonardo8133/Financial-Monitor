import { Link, NavLink } from "react-router-dom";
import { usePrefs } from "../theme/PrefsProvider.jsx";
import { ChartBarIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon, WalletIcon } from "./icons.jsx";

const THEME_CYCLE = { light: "dark", dark: "system", system: "light" };

export function ThemeToggle({ className = "" }) {
  const { prefs, setPref, resolvedTheme } = usePrefs();
  const Icon = prefs.theme === "system" ? MonitorIcon : resolvedTheme === "dark" ? MoonIcon : SunIcon;
  const label =
    prefs.theme === "system" ? "Tema automático (clique para claro)" : resolvedTheme === "dark" ? "Tema escuro (clique para automático)" : "Tema claro (clique para escuro)";
  return (
    <button
      type="button"
      className={`btn-ghost btn-sm rounded-full ${className}`}
      onClick={() => setPref("theme", THEME_CYCLE[prefs.theme] || "light")}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function navClass({ isActive }) {
  return `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
  }`;
}

export function AppShell({ children, width = "max-w-6xl", actions }) {
  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur no-print">
        <div className={`mx-auto flex ${width} items-center gap-2 px-3 py-2 md:px-6`}>
          <Link to="/" className="mr-2 flex items-center gap-2 font-bold text-ink" title="Início">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-fg">
              <ChartBarIcon className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Monitor Financeiro</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/investimentos" className={navClass}>
              <ChartBarIcon className="h-4 w-4" />
              <span>Investimentos</span>
            </NavLink>
            <NavLink to="/gastos" className={navClass}>
              <WalletIcon className="h-4 w-4" />
              <span>Gastos</span>
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {actions}
            <NavLink to="/configuracoes" className={navClass} title="Configurações">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden md:inline">Configurações</span>
            </NavLink>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={`mx-auto ${width} px-3 py-4 md:px-6 md:py-6`}>{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink md:text-2xl">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <div className="text-sm font-semibold text-ink">{title}</div>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
