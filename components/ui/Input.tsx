import { forwardRef, useId, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  help?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, help, error, className = '', ...props },
  ref,
) {
  const id = useId();
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold text-slate-800">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        className={
          'h-12 w-full rounded-2xl border-2 bg-white px-4 text-slate-900 placeholder:text-slate-400 ' +
          'transition-colors focus:outline-none focus:ring-4 ' +
          (error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-primary-100 focus:border-primary focus:ring-primary-100') +
          ' ' +
          className
        }
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-sm text-slate-500">
          {help}
        </p>
      ) : null}
    </div>
  );
});
