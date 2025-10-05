export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="mb-6 w-full max-w-3xl">
      <div className="flex flex-wrap gap-2 rounded-xl bg-blue-900/10 p-1">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const tooltip = tab.tooltip || tab.label;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isActive ? "bg-white text-blue-700 shadow" : "text-blue-700 hover:bg-white/40"
              }`}
              title={tooltip}
              aria-pressed={isActive}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
