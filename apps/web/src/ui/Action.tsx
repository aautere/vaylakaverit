import type { ButtonHTMLAttributes } from 'react';

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary';
};

export function Action({ className, tone = 'primary', type = 'button', ...props }: ActionProps) {
  return (
    <button
      {...props}
      className={['ui-action', `ui-action--${tone}`, className].filter(Boolean).join(' ')}
      type={type}
    />
  );
}
