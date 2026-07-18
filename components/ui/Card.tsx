import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tint?: 'plain' | 'primary' | 'secondary' | 'accent';
};

const tints = {
  plain: 'bg-white border-primary-100',
  primary: 'bg-primary-50 border-primary-100',
  secondary: 'bg-secondary-100/40 border-secondary-100',
  accent: 'bg-accent-100/50 border-accent-100',
} as const;

export function Card({ tint = 'plain', className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-3xl border-2 p-6 shadow-soft ${tints[tint]} ${className}`}
      {...props}
    />
  );
}
