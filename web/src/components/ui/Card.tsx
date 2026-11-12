import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  strong?: boolean;
}

export function Card({ children, className, strong = false, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={twMerge(
        "rounded-3xl transition-shadow duration-300",
        strong ? "glass-strong" : "glass",
        "hover:shadow-float",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/60 px-5 py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-ink-900">{title}</h2>
          {subtitle && <p className="truncate text-[11px] text-ink-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
