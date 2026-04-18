import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: "#F4EEE4",
        clay: "#D9C8AE",
        bark: "#755B44",
        moss: "#60725C",
        sage: "#A7B39A",
        cream: "#FBF8F2",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(117, 91, 68, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
