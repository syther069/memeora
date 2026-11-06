import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOGOS = {
  walrus: { src: '/brand/walrus.png', alt: 'Walrus' },
  sui: { src: '/brand/sui.png', alt: 'Sui' },
} as const;

/** The real Walrus and Sui marks, only where that integration is being named. */
export function IntegrationLogo({ name, size = 20, decorative = false, className }: { name: keyof typeof LOGOS; size?: number; decorative?: boolean; className?: string }) {
  const logo = LOGOS[name];
  return <Image src={logo.src} alt={decorative ? '' : logo.alt} width={size} height={size} className={cn('shrink-0 rounded-[22%]', className)} />;
}

/** The Walrus W as an outline, drawn to Iconoir's grid and stroke so it matches the icons beside it in navigation. */
export function WalrusIcon({ className }: { className?: string; 'aria-hidden'?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M7.5 8.5 9.75 15.5 12 10.5 14.25 15.5 16.5 8.5" />
    </svg>
  );
}
