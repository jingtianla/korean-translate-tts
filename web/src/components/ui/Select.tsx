import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export function Select({ options, className, ...rest }: SelectProps) {
  return (
    <div className="relative inline-flex items-center">
      <select
        {...rest}
        className={twMerge(
          "h-9 w-full cursor-pointer appearance-none rounded-xl border border-brand-100 bg-white/80 pl-3 pr-8",
          "text-xs font-medium text-ink-900 outline-none transition-colors",
          "hover:border-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-brand-500" />
    </div>
  );
}
