import * as React from 'react';
import { cn } from '@/lib/utils';

// Local badge — sharp, zinc. Emphasis by fill weight, never hue.
//  - solid:  black fill, white text (active / primary state)
//  - outline: bordered (neutral state)
//  - muted:  light fill (secondary state)

type BadgeTone = 'solid' | 'outline' | 'muted';

export interface BadgeProps extends React.ComponentProps<'span'> {
  tone?: BadgeTone;
}

const TONES: Record<BadgeTone, string> = {
  solid: 'bg-black text-white',
  outline: 'border border-gray-200 text-black',
  muted: 'bg-white text-black',
};

export default function Badge({ className, tone = 'muted', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide select-none',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
