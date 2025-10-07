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
              className={`relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isActive ? "text-blue-900" : "text-blue-700 hover:text-blue-800"
              }`}
              title={tooltip}
              aria-pressed={isActive}
            >
              <span
                className={`absolute inset-0 -z-10 scale-95 rounded-lg bg-white shadow transition-all duration-200 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0"
                }`}
                aria-hidden="true"
              />
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
