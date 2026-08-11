export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sonora-mustard-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C97A34" />
          <stop offset="55%" stopColor="#A85C1F" />
          <stop offset="100%" stopColor="#8B4515" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#161615" />
      <path
        d="M20 58 C32 30 40 30 50 50 C60 70 68 70 80 42"
        fill="none"
        stroke="url(#sonora-mustard-grad)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle cx="20" cy="58" r="4.5" fill="#C97A34" />
      <circle cx="50" cy="50" r="4.5" fill="#A85C1F" />
      <circle cx="80" cy="42" r="4.5" fill="#8B4515" />
    </svg>
  );
}
