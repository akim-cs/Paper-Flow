'use client';

import styles from './PaperBoatLoader.module.css';

type Props = {
  /** Width and height of the boat image in pixels. Default: 120 */
  size?: number;
  /** Extra Tailwind or custom classes applied to the centering wrapper */
  className?: string;
};

/**
 * Displays the Paper Flow boat logo with a gentle rocking animation,
 * suitable for use on long-running loading screens (e.g. slide generation).
 *
 * Usage:
 *   <PaperBoatLoader />
 *   <PaperBoatLoader size={80} />
 *   <PaperBoatLoader size={120} className="my-8" />
 */
export default function PaperBoatLoader({ size = 120, className = '' }: Props) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-label="Loading…"
      role="status"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/lineart_boat.png"
        alt=""
        aria-hidden="true"
        className={styles.boat}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    </div>
  );
}
