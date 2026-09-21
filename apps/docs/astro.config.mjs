import solid from '@astrojs/solid-js';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return undefined;
  return basePath.replace(/\/$/, '');
}

export default defineConfig({
  site: 'https://gxxcastillo.github.io',
  base: normalizeBasePath(process.env.VITE_BASE_PATH),
  integrations: [
    starlight({
      title: 'solid4m',
      description: 'Typed, reactive forms for SolidJS.',
      favicon: '/favicon.ico',
      editLink: {
        baseUrl: 'https://github.com/gxxcastillo/solid4m/edit/main/apps/docs/'
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/gxxcastillo/solid4m'
        }
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Quick start', slug: 'index' },
            { slug: 'installation' },
            { label: 'Demo', slug: 'demo' }
          ]
        },
        {
          label: 'Guides',
          items: [
            { slug: 'fields' },
            { slug: 'validation' },
            { slug: 'submission' },
            { slug: 'field-arrays' },
            { slug: 'loading-and-resetting' },
            { slug: 'accessibility' },
            { slug: 'server-rendering' },
            { slug: 'theming' },
            { slug: 'custom-fields' },
            { slug: 'solid-vs-react' }
          ]
        },
        {
          label: 'Reference',
          items: [{ slug: 'api' }]
        }
      ]
    }),
    solid()
  ],
  vite: {
    resolve: {
      alias: {
        '@gxxc/solid4m-examples': resolve(__dirname, '../../packages/examples/src/index.ts'),
        'solid4m/themes': resolve(__dirname, '../../packages/solid4m/themes'),
        'solid4m': resolve(__dirname, '../../packages/solid4m/src/index.ts')
      }
    },
    build: {
      sourcemap: true
    }
  }
});
