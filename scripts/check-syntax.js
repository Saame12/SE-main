import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = dir + '/' + entry.name;
    if (entry.isDirectory()) scan(path);
    else if (path.endsWith('.js'))
      execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  }
}
for (const dir of ['server', 'scripts', 'web', 'tests', 'shared']) scan(dir);
console.log('JavaScript syntax checks passed.');
