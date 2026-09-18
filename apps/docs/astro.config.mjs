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
      title: 'solid-formation',
      description: 'Typed, reactive forms for SolidJS.',
      favicon: '/favicon.ico',
      editLink: {
        baseUrl: 'https://github.com/gxxcastillo/solid-formation/edit/main/apps/docs/'
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/gxxcastillo/solid-formation'
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
            { slug: 'theming' },
            { slug: 'validation' },
            { slug: 'submission' },
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
        '@gxxc/solid-formation-examples': resolve(__dirname, '../../packages/examples/src/index.ts'),
        'solid-formation/themes': resolve(__dirname, '../../packages/solid-formation/themes'),
        'solid-formation': resolve(__dirname, '../../packages/solid-formation/src/index.ts')
      }
    },
    build: {
      sourcemap: true
    }
  }
});
