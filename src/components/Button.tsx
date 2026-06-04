import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className = '',
  children,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 border-none rounded-md font-medium cursor-pointer transition-all duration-150 decoration-none relative overflow-hidden select-none whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  let sizeClasses = "";
  if (size === 'sm') sizeClasses = "h-8 px-3 text-xs";
  if (size === 'md') sizeClasses = "h-10 px-4 text-sm";
  if (size === 'lg') sizeClasses = "h-12 px-6 text-base";
  if (size === 'icon') sizeClasses = "h-10 w-10 p-0 rounded-full";

  let variantClasses = "";
  if (variant === 'primary') variantClasses = "bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-sm hover:bg-[var(--accent-primary-hover)] hover:shadow-md";
  if (variant === 'secondary') variantClasses = "bg-[var(--bg-surface-hover)] text-white border border-[var(--border-strong)] hover:bg-[var(--border-strong)]";
  if (variant === 'ghost') variantClasses = "bg-transparent text-zinc-400 hover:bg-[var(--bg-surface-hover)] hover:text-white";
  if (variant === 'danger') variantClasses = "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20";

  const widthClass = fullWidth ? "w-full" : "";

  const finalClasses = `${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`;

  return (
    <button className={finalClasses.trim()} {...props}>
      {icon && <span className="flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};
