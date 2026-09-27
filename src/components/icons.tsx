import type { ReactNode } from 'react';

/**
 * Inline SVG line icons (24×24, stroke = currentColor), so they render the same on every platform
 * instead of depending on the OS emoji font. Shapes follow the Feather/Lucide style (ISC licence).
 */
function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const IconCompass = () => (
  <Svg>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M15.5 8.5 13.6 13.6 8.5 15.5 10.4 10.4z" />
  </Svg>
);

export const IconMap = () => (
  <Svg>
    <path d="M3 6.5v14l6-3 6 3 6-3v-14l-6 3-6-3z" />
    <path d="M9 3.5v14M15 6.5v14" />
  </Svg>
);

export const IconCalendar = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Svg>
);

export const IconPin = () => (
  <Svg>
    <path d="M19.5 10c0 5.5-7.5 11-7.5 11s-7.5-5.5-7.5-11a7.5 7.5 0 0 1 15 0z" />
    <circle cx="12" cy="10" r="2.6" />
  </Svg>
);

export const IconWallet = () => (
  <Svg>
    <path d="M4 7.5h14.5a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13A2.5 2.5 0 0 1 3 17.5v-11A2.5 2.5 0 0 1 5.5 4H17v3.5" />
    <circle cx="16.5" cy="13.75" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconBook = () => (
  <Svg>
    <path d="M5 19V5a2 2 0 0 1 2-2h12v14H7a2 2 0 0 0-2 2 2 2 0 0 0 2 2h12" />
  </Svg>
);

export const IconUser = () => (
  <Svg>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </Svg>
);

export const IconArrow = () => (
  <Svg size={18}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconBed = () => (
  <Svg size={15}>
    <path d="M3 18V6M3 14h18v4M21 14v-2.5a3 3 0 0 0-3-3h-7V14" />
    <circle cx="7" cy="10.5" r="1.8" />
  </Svg>
);

export const IconLock = ({ open = false }: { open?: boolean }) => (
  <Svg size={14}>
    <rect x="5" y="11" width="14" height="9.5" rx="2" />
    <path d={open ? 'M8.5 11V7.5a3.5 3.5 0 0 1 6.8-1.2' : 'M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11'} />
  </Svg>
);

export const IconClock = () => (
  <Svg size={13}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconMapPin = () => (
  <Svg size={18}>
    <path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 0 1 14 0z" />
    <circle cx="12" cy="10" r="2.4" />
  </Svg>
);

export const IconNavigate = () => (
  <Svg size={18}>
    <path d="M3 11 21 3l-8 18-2-8z" />
  </Svg>
);

export const IconExternal = () => (
  <Svg size={14}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);

export const IconFood = () => (
  <Svg size={15}>
    <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H17" />
  </Svg>
);

export const IconStarLine = () => (
  <Svg size={15}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />
  </Svg>
);

export const IconInfo = () => (
  <Svg size={14}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5v.5" />
  </Svg>
);
