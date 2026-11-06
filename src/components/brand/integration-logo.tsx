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
