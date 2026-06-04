import React, { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && <label className="text-sm font-medium text-white">{label}</label>}
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-zinc-400 flex items-center justify-center">{icon}</span>}
        <input 
          className={`w-full h-10 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md px-4 text-white text-sm transition-all duration-150 outline-none placeholder:text-zinc-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 ${icon ? 'pl-10' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          {...props} 
        />
      </div>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};
