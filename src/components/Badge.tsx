import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider whitespace-nowrap";
  
  let variantClasses = "";
  if (variant === 'primary') variantClasses = "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20";
  if (variant === 'secondary') variantClasses = "bg-white/10 text-zinc-400 border border-[var(--border-strong)]";
  if (variant === 'success') variantClasses = "bg-green-500/10 text-green-500 border border-green-500/20";
  if (variant === 'warning') variantClasses = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  if (variant === 'error') variantClasses = "bg-red-500/10 text-red-500 border border-red-500/20";

  return (
    <span className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </span>
  );
};
