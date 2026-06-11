import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        zinc: {
          50: '#09090b',  // near black text
          100: '#18181b', // dark gray
          200: '#27272a', // text-zinc-200
          300: '#3f3f46',
          400: '#52525b', // muted text
          500: '#71717a',
          600: '#a1a1aa',
          700: '#e4e4e7', // slightly darker border
          800: '#f3f4f6', // soft hover / soft border
          900: '#ffffff', // bg-zinc-900 -> white card
          950: '#f9fafb', // bg-zinc-950 -> page bg
        },
        slate: {
          50: '#0f172a',  // slate-900 text
          100: '#1e293b', // slate-800
          200: '#334155', // slate-700
          300: '#475569',
          400: '#64748b', // muted text
          500: '#94a3b8',
          600: '#cbd5e1',
          700: '#e2e8f0', // border
          800: '#f1f5f9', // light hover / background
          900: '#ffffff', // bg-slate-900 -> white card
          950: '#f8fafc', // bg-slate-950 -> page bg
        },
        red: {
          950: '#fee2e2', // soft light red bg
          900: '#ef4444',
          800: '#dc2626',
          400: '#b91c1c', // dark red text
          300: '#7f1d1d', // dark red text
        },
        amber: {
          950: '#fef3c7', // soft light amber bg
          900: '#d97706',
          800: '#b45309', // amber border
          400: '#b45309', // dark amber icon
          200: '#78350f', // dark amber text
          100: '#451a03',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.01)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.01), 0 1px 2px -1px rgba(0, 0, 0, 0.01)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.02), 0 4px 6px -4px rgba(0, 0, 0, 0.02)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
        '2xl': "0 20px 40px -10px rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
