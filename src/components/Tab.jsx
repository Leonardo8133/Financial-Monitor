import { Tab } from '@headlessui/react'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="w-full max-w-3xl mb-6">
      <Tab.Group selectedIndex={tabs.findIndex(t => t.key === activeTab)} onChange={(index) => onChange(tabs[index].key)}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/10 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white shadow text-blue-700'
                    : 'text-blue-700 hover:bg-white/[0.12] hover:text-blue-800'
                )
              }
            >
              <div className="flex items-center justify-center gap-2">
                {tab.icon}
                {tab.label}
              </div>
            </Tab>
          ))}
        </Tab.List>
      </Tab.Group>
    </div>
  )
}