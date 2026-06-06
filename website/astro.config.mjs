// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Oxide-SEO',
      favicon: '/favicon.png',
      customCss: ['./src/styles/global.css'],
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
      },
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Introduction', slug: 'guides/introduction' },
          ],
        },
        {
          label: 'Features',
          items: [
            { label: 'GSC Dashboard', slug: 'features/gsc-dashboard' },
            { label: 'Keyword Vault', slug: 'features/keyword-vault' },
            { label: 'Site Audit', slug: 'features/site-audit' },
            { label: 'Competitor Analysis', slug: 'features/competitor-analysis' },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});