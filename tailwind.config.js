/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/views/**/*.eta"],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: "#C62828",
          dark: "#8B0000",
          light: "#E53935",
        },
        gold: {
          DEFAULT: "#D4AF37",
          dark: "#B8860B",
          light: "#F4D03F",
        },
        obsidian: {
          DEFAULT: "#0D0D0D",
          light: "#1A1A2E",
          mid: "#141424",
        },
        parchment: {
          DEFAULT: "#E8DCC8",
          dark: "#C8B99A",
          muted: "#A89880",
        },
      },
      fontFamily: {
        cinzel: ["Cinzel", "Georgia", "serif"],
        body: ["system-ui", "-apple-system", "sans-serif"],
      },
      backgroundImage: {
        "hero-atmosphere":
          "radial-gradient(ellipse 100% 70% at 50% -5%, rgba(139,0,0,0.55) 0%, transparent 55%), " +
          "radial-gradient(ellipse 70% 50% at 95% 105%, rgba(184,134,11,0.18) 0%, transparent 50%), " +
          "linear-gradient(180deg, #0D0D0D 0%, #1A1A2E 100%)",
        "gold-divider":
          "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.6) 50%, transparent 100%)",
        "card-dark":
          "linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(13,13,13,0.95) 100%)",
      },
      boxShadow: {
        "glow-crimson": "0 0 30px rgba(139,0,0,0.4), 0 0 60px rgba(139,0,0,0.15)",
        "glow-gold": "0 0 20px rgba(212,175,55,0.3)",
        "btn-crimson":
          "0 4px 15px rgba(139,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      },
    },
  },
  plugins: [],
};
