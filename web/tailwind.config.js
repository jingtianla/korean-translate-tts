import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F1EFFE",
          100: "#E5E0FD",
          200: "#CFC5FB",
          300: "#AE9DF6",
          400: "#8D7BF1",
          500: "#6C5CE7",
          600: "#5B4BE0",
          700: "#4A3BC2",
          800: "#3A2F98",
        },
        sky: {
          soft: "#4A90D9",
        },
        ink: {
          900: "#1F2430",
          600: "#5B6172",
          400: "#8C92A4",
        },
        ok: "#2BB673",
        warn: "#F5A623",
        danger: "#E5484D",
      },
      fontFamily: {
        sans: [
          "Noto Sans SC",
          "Noto Sans KR",
          "Noto Sans",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.35rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(76, 70, 160, 0.10)",
        float: "0 18px 48px rgba(76, 70, 160, 0.16)",
        glow: "0 8px 24px rgba(108, 92, 231, 0.32)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.65" },
          "70%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.42s ease-out both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.7,0.3,1) infinite",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
