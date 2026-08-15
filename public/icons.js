// Minimal stand-ins for the lucide-react icons used in app.jsx. Kept as
// plain inline SVGs so the whole app can run without a bundler.
function Icon({ size = 16, color = "currentColor", style, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...rest}
    >
      {children}
    </svg>
  );
}

function Check(props) {
  return (
    <Icon {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}
function Plus(props) {
  return (
    <Icon {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}
function Lock(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}
function Unlock(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 7.5-2" />
    </Icon>
  );
}
function RefreshCw(props) {
  return (
    <Icon {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.5 9a8.5 8.5 0 0 1 14-3.5L23 10M1 14l5.5 4.5A8.5 8.5 0 0 0 20.5 15" />
    </Icon>
  );
}
function Utensils(props) {
  return (
    <Icon {...props}>
      <path d="M6 2v8a2 2 0 0 0 2 2v10" />
      <path d="M6 2v6M10 2v6" />
      <path d="M18 2c-2 2-2 6-2 8a2 2 0 0 0 2 2v10" />
    </Icon>
  );
}
function Users(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M21 20c0-2.6-1.9-4.8-4.4-5.5" />
    </Icon>
  );
}
function Trash2(props) {
  return (
    <Icon {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Icon>
  );
}
function ChevronDown(props) {
  return (
    <Icon {...props}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  );
}
function Trophy(props) {
  return (
    <Icon {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H4v2a4 4 0 0 0 4 3" />
      <path d="M16 5h4v2a4 4 0 0 1-4 3" />
      <path d="M12 13v4" />
      <path d="M8 21h8" />
      <path d="M10 17h4v4h-4z" />
    </Icon>
  );
}
function Coffee(props) {
  return (
    <Icon {...props}>
      <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z" />
      <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 3c0 1-1 1-1 2s1 1 1 2" />
      <path d="M11 3c0 1-1 1-1 2s1 1 1 2" />
    </Icon>
  );
}
