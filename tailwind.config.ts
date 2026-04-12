import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          start: "#D0C8C8",
          end: "#E8E0E0",
        },
        kriss: {
          black: "#000000",
          charcoal: "#222222",
          glass: "rgba(255, 255, 255, 0.4)",
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        geist: ['Geist', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        kanit: ['Kanit', 'sans-serif'],
        pacifico: ['Pacifico', 'cursive'],
        heading: ["'Instrument Serif'", 'serif'],
        body: ["'Barlow'", 'sans-serif'],
      },
      borderRadius: {
        'pill': '9999px',
        'clay': '40px',
      },
      backdropBlur: {
        'xs': '2px',
        'kriss': '20px',
      },
      boxShadow: {
        'clay': '10px 10px 20px rgba(0, 0, 0, 0.05), -10px -10px 20px rgba(255, 255, 255, 0.8), inset 4px 4px 8px rgba(255, 255, 255, 0.5), inset -4px -4px 8px rgba(0, 0, 0, 0.02)',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "kriss-gradient": "linear-gradient(135deg, #D0C8C8 0%, #E8E0E0 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
