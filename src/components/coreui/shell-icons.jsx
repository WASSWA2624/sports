export function ShellIcon({ name, className }) {
  const props = {
    "aria-hidden": "true",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "1.8",
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "scores":
      return (
        <svg {...props}>
          <rect x="3.5" y="4.5" width="7.5" height="15" rx="1.75" />
          <path d="M7.25 8.5v7" />
          <path d="M13.5 8.5h7" />
          <path d="M13.5 12h5.5" />
          <path d="M13.5 15.5h7" />
        </svg>
      );
    case "news":
      return (
        <svg {...props}>
          <path d="M5 6.5a2 2 0 0 1 2-2h10v13a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2z" />
          <path d="M17 17.5V6.5h2v11" />
          <path d="M8.5 9.5h5.5" />
          <path d="M8.5 12.5h7" />
          <path d="M8.5 15.5h7" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m19 19-4.1-4.1" />
        </svg>
      );
    case "profile":
      return (
        <svg {...props}>
          <circle cx="12" cy="8.25" r="3.25" />
          <path d="M5 19c1.6-3 4.05-4.5 7-4.5S17.4 16 19 19" />
        </svg>
      );
    case "locale":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.4 2.2 3.8 5.2 3.8 8.5S14.4 18.3 12 20.5c-2.4-2.2-3.8-5.2-3.8-8.5S9.6 5.7 12 3.5Z" />
        </svg>
      );
    case "theme":
      return (
        <svg {...props}>
          <path d="M12 4.5v2.25" />
          <path d="M12 17.25V19.5" />
          <path d="m6.7 6.7 1.6 1.6" />
          <path d="m15.7 15.7 1.6 1.6" />
          <path d="M4.5 12h2.25" />
          <path d="M17.25 12h2.25" />
          <path d="m6.7 17.3 1.6-1.6" />
          <path d="m15.7 8.3 1.6-1.6" />
          <circle cx="12" cy="12" r="3.25" />
        </svg>
      );
    case "favorites":
      return (
        <svg {...props}>
          <path d="m12 4 2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 16l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L12 4Z" />
        </svg>
      );
    case "football":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m12 8.1 2.3 1.7-.85 2.7h-2.9l-.85-2.7L12 8.1Z" />
          <path d="m9.65 12.5-1.85 2.3" />
          <path d="m14.35 12.5 1.85 2.3" />
          <path d="m9.7 9.8-2.65-.7" />
          <path d="m14.3 9.8 2.65-.7" />
        </svg>
      );
    case "tennis":
      return (
        <svg {...props}>
          <circle cx="9.5" cy="10" r="4.5" />
          <path d="M7.3 6.1c2.9 1.8 4.1 5 3.2 8.1" />
          <path d="m13 13 5.5 5.5" />
          <path d="m15.3 15.3 2.3-2.3" />
        </svg>
      );
    case "basketball":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5c2.5 2.2 4 5.3 4 8.5s-1.5 6.3-4 8.5" />
          <path d="M12 3.5c-2.5 2.2-4 5.3-4 8.5s1.5 6.3 4 8.5" />
          <path d="M4.5 12h15" />
        </svg>
      );
    case "hockey":
      return (
        <svg {...props}>
          <path d="M8 5.5h7l-2 7H6" />
          <path d="m6 12.5 2 4.5" />
          <path d="M13.5 17.5h4.25a1.75 1.75 0 0 0 0-3.5h-2" />
        </svg>
      );
    case "golf":
      return (
        <svg {...props}>
          <path d="M9 19.5V5" />
          <path d="m9 5 7 2.3L9 10" />
          <path d="M6 19.5h10" />
        </svg>
      );
    case "baseball":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.25 6.5c1.7 1.7 2.7 3.9 2.7 6.2s-1 4.5-2.7 6.2" />
          <path d="M15.75 6.5c-1.7 1.7-2.7 3.9-2.7 6.2s1 4.5 2.7 6.2" />
        </svg>
      );
    case "snooker":
      return (
        <svg {...props}>
          <circle cx="7" cy="13" r="2.25" />
          <circle cx="12" cy="10" r="2.25" />
          <circle cx="12" cy="16" r="2.25" />
          <circle cx="17" cy="13" r="2.25" />
          <path d="M4.5 5.5h15" />
        </svg>
      );
    case "volleyball":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5c3.2 1.1 5.5 4.1 6 7.6-2.3.1-4.9-.7-7.2-2.3" />
          <path d="M7 6.2c1.8 1.7 2.8 4.2 2.6 6.7-2.5.5-5 .1-7.1-1.2" />
          <path d="M8.2 17.9c2.6-.8 5.5-.5 8 .9" />
        </svg>
      );
    case "more":
      return (
        <svg {...props}>
          <path d="m8 10 4 4 4-4" />
        </svg>
      );
    case "menu":
      return (
        <svg {...props}>
          <path d="M4.5 7.5h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 16.5h15" />
        </svg>
      );
    case "close":
      return (
        <svg {...props}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...props}>
          <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
        </svg>
      );
    default:
      return null;
  }
}
