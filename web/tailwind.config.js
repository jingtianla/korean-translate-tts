import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 专业蓝系：冷调、克制、有层次，避免高饱和紫。
        brand: {
          50: "#F1F6FE",
          100: "#E2ECFC",
          200: "#C6D9F9",
          300: "#9CBDF4",
          400: "#6C9BEC",
          500: "#3F78DF",
          600: "#2A5CC8",
          700: "#2149A5",
          800: "#1B3B84",
          900: "#172E66",
        },
        sky: {
          soft: "#4FA8D8",
        },
        ink: {
          900: "#111A2E",
          700: "#2C3A52",
          600: "#4A5A73",
          400: "#8391A6",
        },
        surface: {
          50: "#F7FAFF",
          100: "#EEF4FD",
          200: "#E3ECF9",
        },
        ok: "#1E9E6A",
        warn: "#D98324",
        danger: "#D93F45",
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
        glass: "0 6px 28px rgba(35, 73, 145, 0.08)",
        float: "0 16px 44px rgba(35, 73, 145, 0.14)",
        glow: "0 6px 20px rgba(42, 92, 200, 0.30)",
        card: "0 1px 2px rgba(24, 43, 78, 0.04), 0 12px 32px -12px rgba(24, 43, 78, 0.12)",
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
