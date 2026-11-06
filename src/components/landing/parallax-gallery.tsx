'use client';

import * as React from 'react';
import Image, { type StaticImageData } from 'next/image';
import { motion, type MotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import assistant from '../../../public/guide/assistant.jpg';
import budgets from '../../../public/guide/budgets.jpg';
import business from '../../../public/guide/business.jpg';
import memory from '../../../public/guide/memory.jpg';
import overview from '../../../public/guide/overview.jpg';
import proof from '../../../public/guide/proof.jpg';
import transactions from '../../../public/guide/transactions.jpg';

/** Each tile looks at a different part of a real screen, past the navigation rail. */
const TILES: { src: StaticImageData; position: string }[][] = [
  [{ src: overview, position: '30% 0%' }, { src: memory, position: '55% 40%' }, { src: budgets, position: '40% 0%' }],
  [{ src: assistant, position: '60% 50%' }, { src: transactions, position: '45% 30%' }, { src: proof, position: '35% 0%' }],
  [{ src: business, position: '35% 0%' }, { src: overview, position: '100% 40%' }, { src: memory, position: '30% 0%' }],
  [{ src: budgets, position: '90% 30%' }, { src: proof, position: '80% 60%' }, { src: transactions, position: '100% 0%' }],
];

/** Where each column starts, so that it can travel down through the whole section. */
const COLUMN_START = ['-top-[45%]', '-top-[95%]', '-top-[45%]', '-top-[75%]'];

function Column({ tiles, y, className }: { tiles: typeof TILES[number]; y: MotionValue<number> | number; className: string }) {
  return (
    <motion.div className={`relative flex h-full w-1/2 flex-col gap-[2vw] motion-reduce:top-0 md:w-1/4 ${className}`} style={{ y }}>
      {tiles.map((tile, index) => (
        <div key={index} className="relative h-full w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-sunken)]">
          <Image src={tile.src} alt="" fill sizes="(max-width: 768px) 80vw, 45vw" placeholder="blur" className="pointer-events-none object-cover" style={{ objectPosition: tile.position }} />
        </div>
      ))}
    </motion.div>
  );
}

/**
 * Four columns of screens moving at their own speeds. Adapted from Skiper 30 by
 * Skiper UI (https://skiper-ui.com/v1/skiper30). Free version, attribution is shown
 * in the site footers. Inspired, its author notes, by siena.film.
 *
 * Changes from the source: real Memeora screens in sample data in place of stock
 * images, two columns on a phone, a still layout under reduced motion, and the
 * smooth scrolling lives in SmoothScroll, which also cleans up after itself.
 */
export function ParallaxGallery() {
  const gallery = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [height, setHeight] = React.useState(0);
  const { scrollYProgress } = useScroll({ target: gallery, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, height * 2]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, height * 3.3]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, height * 1.25]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, height * 3]);

  React.useEffect(() => {
    const resize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', resize);
    const frame = requestAnimationFrame(resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const speeds = [y1, y2, y3, y4];
  return (
    <div ref={gallery} aria-hidden className="relative box-border flex h-[175vh] gap-[2vw] overflow-hidden p-[2vw]">
      {TILES.map((tiles, index) => (
        <Column key={index} tiles={tiles} y={reduced ? 0 : speeds[index]} className={`${COLUMN_START[index]} ${index > 1 ? 'hidden md:flex' : ''}`} />
      ))}
    </div>
  );
}
