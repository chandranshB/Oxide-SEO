/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0f1014',
        'bg-surface': '#18191e',
        'bg-surface-hover': '#22232a',
        'accent-primary': '#3ecf8e',
        'accent-primary-hover': '#2db379',
        'accent-error': '#ef4444',
        'accent-warning': '#f59e0b',
        'border-subtle': '#27272a',
        'border-strong': '#3f3f46',
      }
    },
  },
  plugins: [],
}
