import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#d8dee9",
        ink: "#111827",
        muted: "#5b6472",
        panel: "#ffffff",
        surface: "#f5f7fa",
        accent: "#0f766e",
        warning: "#b45309",
        danger: "#b91c1c"
      }
    }
  },
  plugins: []
};

export default config;
