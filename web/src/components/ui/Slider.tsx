import type { InputHTMLAttributes } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: number;
  min: number;
  max: number;
  step?: number;
}

export function Slider({ value, min, max, step = 0.05, className, ...rest }: SliderProps) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className={`speed-range w-full ${className || ""}`}
      style={{ "--fill": `${fill}%` } as React.CSSProperties}
      value={value}
      min={min}
      max={max}
      step={step}
      {...rest}
    />
  );
}
