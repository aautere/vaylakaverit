import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary';
};

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  ({ className, tone = 'primary', type = 'button', ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      className={['ui-action', `ui-action--${tone}`, className].filter(Boolean).join(' ')}
      type={type}
    />
  ),
);

Action.displayName = 'Action';
