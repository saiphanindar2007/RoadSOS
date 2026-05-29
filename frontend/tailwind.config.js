/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        emergency: {
          50:  "#fff1f2",
          100: "#ffe4e6",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          900: "#7f1d1d",
        },
        surface: {
          900: "#030712",
          800: "#0f172a",
          700: "#1e293b",
          600: "#334155",
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        body:    ['"DM Sans"', "sans-serif"],
        mono:    ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "sos-ring": "sos-ring 2s ease-in-out infinite",
        "float":    "float 3s ease-in-out infinite",
        "fade-up":  "fade-up 0.4s ease-out",
      },
      keyframes: {
        "sos-ring": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.5)" },
          "50%":     { boxShadow: "0 0 0 24px rgba(239,68,68,0)" },
        },
        "float": {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-6px)" },
        },
        "fade-up": {
          "0%":   { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};