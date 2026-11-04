import React from 'react';
export function Button({ children, className, variant = 'default', size = 'default', ...props }: any) {
  const base = "inline-flex items-center justify-center rounded-2xl font-display font-bold transition-colors focus-visible:outline-none disabled:opacity-50 active:scale-[0.98]";
  const variants: any = { default: "bg-primary text-primary-foreground shadow-glow", outline: "border border-input bg-background hover:bg-accent", ghost: "hover:bg-accent text-primary", secondary: "bg-secondary text-secondary-foreground" };
  const sizes: any = { default: "h-10 px-4 py-2", sm: "h-8 px-3 text-xs", lg: "h-12 px-8 text-lg" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
}
