import type { HTMLAttributes } from 'react';

type StatusTone = 'info' | 'success' | 'warning' | 'error';

type StatusMessageProps = HTMLAttributes<HTMLParagraphElement> & {
  tone?: StatusTone;
};

export function StatusMessage({ className, role, tone = 'info', ...props }: StatusMessageProps) {
  const isError = tone === 'error';

  return (
    <p
      {...props}
      aria-live={isError ? 'assertive' : 'polite'}
      className={['ui-status', `ui-status--${tone}`, className].filter(Boolean).join(' ')}
      role={role ?? (isError ? 'alert' : 'status')}
    />
  );
}
