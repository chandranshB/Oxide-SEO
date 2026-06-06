/** @type {import('tailwindcss').Config} */

export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      colors: {
        'wiki-bg': 'var(--color-wiki-bg)',
        'wiki-surface': 'var(--color-wiki-surface)',
        'wiki-border': 'var(--color-wiki-border)',
        'wiki-link': 'var(--color-wiki-link)',
        'wiki-text': 'var(--color-wiki-text)',
        'wiki-text-muted': 'var(--color-wiki-text-muted)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        'press-start': ['"Press Start 2P"', 'cursive'],
      },
      boxShadow: {
        'flat-depth': '0 1px 2px rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.06)',
      }
    },
  },
};
