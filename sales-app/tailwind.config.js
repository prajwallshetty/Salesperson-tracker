/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd2fe",
          300: "#93b3fd",
          400: "#6089fa",
          500: "#3d63f5",
          600: "#2842ea",
          700: "#2131d6",
          800: "#212bad",
          900: "#212a89",
          950: "#171b53",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        pulseRing: { "0%": { transform: "scale(0.9)", opacity: "1" }, "100%": { transform: "scale(1.8)", opacity: "0" } },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        pulseRing: "pulseRing 1.6s cubic-bezier(0.2,0.6,0.4,1) infinite",
      },
    },
  },
  plugins: [],
};
