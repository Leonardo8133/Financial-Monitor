function Icon({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowDownTrayIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 18h16" />
    </Icon>
  );
}

export function ArrowUpTrayIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 21V9" />
      <path d="M7 13l5-5 5 5" />
      <path d="M4 6h16" />
    </Icon>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 7l-5 5 5 5" />
      <path d="M19 12H5" />
    </Icon>
  );
}

export function DocumentIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </Icon>
  );
}

export function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V5h6v2" />
    </Icon>
  );
}

export function ChartBarIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 20h16" />
      <path d="M8 20V10" />
      <path d="M12 20V4" />
      <path d="M16 20v-7" />
    </Icon>
  );
}

export function TableCellsIcon(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1" />
      <path d="M4 11h16" />
      <path d="M10 5v14" />
      <path d="M14 5v14" />
    </Icon>
  );
}

export function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

export function DocumentArrowDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M12 11v6" />
      <path d="M9.5 15.5L12 18l2.5-2.5" />
    </Icon>
  );
}

export function UserCircleIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      <circle cx="12" cy="12" r="9" />
    </Icon>
  );
}

export function TrendingUpIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 19h16" />
      <path d="M4 11l5 5 4-4 5 5 2-2" />
      <path d="M14 7h6v6" />
    </Icon>
  );
}

export function SettingsIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2-1.1l-1-1.7a1 1 0 0 1 0-.9l1-1.7a1 1 0 0 0-.2-1.1l-1.2-1.2a1 1 0 0 0-1.1-.2l-1.7 1a1 1 0 0 1-.9 0l-1.7-1a1 1 0 0 0-1.1.2L9 8.6a1 1 0 0 0-.2 1.1l1 1.7a1 1 0 0 1 0 .9l-1 1.7a1 1 0 0 0 .2 1.1l1.2 1.2a1 1 0 0 0 1.1.2l1.7-1a1 1 0 0 1 .9 0l1.7 1a1 1 0 0 0 1.1-.2z" />
    </Icon>
  );
}

export function SunIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props) {
  return (
    <Icon {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Icon>
  );
}

export function MonitorIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </Icon>
  );
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Icon>
  );
}

export function XIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function FilterIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 5h16l-6 7v6l-4 2v-8z" />
    </Icon>
  );
}

export function CalculatorIcon(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0" />
    </Icon>
  );
}

export function WalletIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h13v4" />
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M16 13h2" />
    </Icon>
  );
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 12l5 5L20 7" />
    </Icon>
  );
}

export function LockIcon(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  );
}

export function CopyIcon(props) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </Icon>
  );
}

export function ChevronDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function SparklesIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </Icon>
  );
}

export function EyeOffIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 8.5 4 9.5 7a11.7 11.7 0 0 1-2.6 3.9" />
      <path d="M6.2 6.2C4.1 7.6 2.8 9.6 2.5 12c1 3 4.5 7 9.5 7a9.8 9.8 0 0 0 4.2-.9" />
    </Icon>
  );
}
