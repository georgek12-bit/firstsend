import type { CSSProperties } from 'react';

/**
 * Props for a fade-up-on-scroll element (see components/Motion.tsx).
 * A percentage offset makes it a masked line reveal, triggered by its parent.
 */
export function reveal(offset = '24px', delay = 0, style?: CSSProperties) {
  return {
    'data-reveal': offset,
    style: { ...style, '--rv': offset, '--rd': `${delay}ms` } as CSSProperties,
  };
}
