function Icon({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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
