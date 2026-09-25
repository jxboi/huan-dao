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

export const IconArrow = () => (
  <Svg size={18}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
