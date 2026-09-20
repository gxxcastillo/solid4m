import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const facadeDir = resolve(repoRoot, 'packages/solid-formation');
const packDir = resolve(__dirname, '.pack');

function run(command, args, cwd) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

// Fresh dist/, matching what would actually get published — pnpm pack does
// not run any build step of its own.
run('node', ['scripts/build.mjs'], facadeDir);

rmSync(packDir, { recursive: true, force: true });
run('pnpm', ['pack', '--pack-destination', packDir], facadeDir);
const tarball = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
if (!tarball) throw new Error(`no tarball produced in ${packDir}`);

// --no-save: the tarball's filename embeds the version, so persisting it to
// package.json would churn on every release. Installed alongside (not
// instead of) this fixture's own devDependencies in the same command.
run('npm', ['install', resolve(packDir, tarball), '--no-save'], __dirname);

const runtimeExports = JSON.parse(
  execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      "process.stdout.write(JSON.stringify(Object.keys(await import('solid-formation')).sort()))"
    ],
    {
      cwd: __dirname,
      encoding: 'utf8'
    }
  )
);
writeFileSync(
  resolve(__dirname, 'consumer.gen.ts'),
  `import { ${runtimeExports.join(', ')} } from 'solid-formation';\n${runtimeExports.map((name) => `void ${name};`).join('\n')}\n`
);
run('npx', ['tsc', '-p', 'tsconfig.consumer.json'], __dirname);

run('npx', ['vite', 'build', '--config', 'vite.config.ssr.ts'], __dirname);
run('npx', ['vite', 'build', '--config', 'vite.config.client.ts'], __dirname);

run('npx', ['playwright', 'test'], __dirname);
