import { spawnSync } from 'node:child_process';

// O watcher reinicia este processo ao alterar src; tsc preserva metadata dos decorators.
const result = spawnSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  {
    stdio: 'inherit',
  },
);
if (result.error || result.status !== 0) process.exit(1);
await import('../dist/main.js');
