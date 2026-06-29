import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0b",
        panel: "#121214",
        edge: "#26262b",
        muted: "#8a8a93",
        bone: "#e8e6df",
        amber: "#d9a441",
        signal: "#5fb3a3",
        alarm: "#c45b5b",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
