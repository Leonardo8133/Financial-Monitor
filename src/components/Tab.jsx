export function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="inline-flex min-w-full gap-1 rounded-xl bg-surface-3 p-1 sm:min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                isActive ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
              title={tab.tooltip || tab.label}
              aria-pressed={isActive}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge !== 0 && (
                <span className="rounded-full bg-accent/15 px-1.5 text-[0.65rem] font-semibold text-accent">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
