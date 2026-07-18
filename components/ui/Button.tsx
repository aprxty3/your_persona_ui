import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 ' +
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-soft hover:bg-primary-600 hover:shadow-pop',
  // accent is ONLY for the most important CTAs — don't sprinkle it everywhere (§6.1).
  accent:
    'bg-accent text-white shadow-pop hover:bg-accent-700',
  outline:
    'border-2 border-primary-200 bg-white text-primary-700 hover:border-primary hover:bg-primary-50',
  ghost: 'text-primary-700 hover:bg-primary-50',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-8 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', loading, className = '', children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        aria-busy={loading || undefined}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {children}
      </button>
    );
  },
);
