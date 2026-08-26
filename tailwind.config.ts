import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { navy: "#1F3864", steel: "#2E5496", success: "#2E7D32" } } },
  plugins: []
};
export default config;
