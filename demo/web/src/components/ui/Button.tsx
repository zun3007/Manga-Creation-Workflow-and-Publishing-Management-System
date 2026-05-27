import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ink' | 'vermilion' | 'ghost';
  children: ReactNode;
}

export function Button({ variant = 'ink', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...rest}>
      {children}
    </button>
  );
}
