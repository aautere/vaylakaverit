import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className, ...props }: CardProps) {
  return <section {...props} className={['ui-card', className].filter(Boolean).join(' ')} />;
}
