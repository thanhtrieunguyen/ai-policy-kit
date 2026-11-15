import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
    action: 'src/action/index.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  shims: true,
  noExternal: ['yaml'],
  banner: {
    js: `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);`,
  },
  outExtension() {
    return {
      js: '.js',
    };
  },
});
