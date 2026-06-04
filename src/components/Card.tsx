import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ glass, className = '', children, ...props }) => {
  const baseClasses = "rounded-xl p-6 transition-all duration-250";
  const standardClasses = "bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md";
  const glassClasses = "glass";

  const finalClasses = `${baseClasses} ${glass ? glassClasses : standardClasses} ${className}`;

  return (
    <div className={finalClasses.trim()} {...props}>
      {children}
    </div>
  );
};
