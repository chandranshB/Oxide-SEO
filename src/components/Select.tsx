import { useState, useRef, useEffect } from 'react';
import { ArrowDown01Icon } from 'hugeicons-react';

export interface SelectOption {
  value: string;
  label: string;
  colorClass?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 bg-[var(--bg-base)] border text-sm rounded-lg px-3 py-2 outline-none transition-all ${
          isOpen ? 'border-[var(--accent-primary)] shadow-[0_0_0_1px_var(--accent-primary)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
        }`}
      >
        <span className={`truncate font-medium ${selectedOption?.colorClass || 'text-white'}`}>
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
        </span>
        <ArrowDown01Icon 
          size={16} 
          className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between gap-2 ${
                  value === option.value 
                    ? 'bg-white/5 font-medium' 
                    : 'hover:bg-white/5'
                }`}
              >
                <span className={option.colorClass || (value === option.value ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200')}>{option.label}</span>
                {value === option.value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${option.colorClass || 'text-white'}`}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
