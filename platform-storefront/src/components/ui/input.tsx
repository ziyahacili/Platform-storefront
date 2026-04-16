import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full px-4 py-2 rounded-lg border border-slate-300',
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:bg-slate-100 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full px-4 py-2 rounded-lg border border-slate-300',
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:bg-slate-100 disabled:cursor-not-allowed',
        'resize-none',
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full px-4 py-2 rounded-lg border border-slate-300',
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:bg-slate-100 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
