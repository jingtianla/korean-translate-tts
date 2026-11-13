import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-glow hover:bg-brand-700 hover:shadow-float hover:-translate-y-0.5 disabled:shadow-none",
  secondary:
    "bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 hover:-translate-y-0.5",
  ghost: "text-ink-600 hover:bg-white/70 hover:text-brand-600",
  outline:
    "border border-brand-200/80 bg-white/60 text-brand-700 hover:border-brand-400 hover:bg-white",
  danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2.5",
  icon: "h-10 w-10 p-0 justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={twMerge(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 select-none",
        "focus-visible:focus-ring active:translate-y-0 active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
