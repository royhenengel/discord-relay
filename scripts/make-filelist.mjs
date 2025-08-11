// scripts/make-filelist.mjs
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const repo = process.env.GITHUB_REPOSITORY || "royhenengel/discord-relay";
const branch = process.env.TARGET_BRANCH || "main";

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter(p => !p.startsWith('node_modules/') && !p.startsWith('dist/'));

const lines = [
  '# FILELIST',
  '',
  '_Auto-generated. Links point to raw file contents on the current branch._',
  '',
];

for (const p of files) {
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${p}`;
  lines.push(`- [\`${p}\`](${url})`);
}

writeFileSync('FILELIST.md', lines.join('\n') + '\n', 'utf8');
console.log(`Wrote FILELIST.md with ${files.length} files.`);
