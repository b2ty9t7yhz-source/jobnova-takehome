import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifests = [
  "package.json",
  "packages/web/package.json",
  "packages/automation/package.json",
];

const versions = await Promise.all(
  manifests.map(async (manifestPath) => {
    const contents = await readFile(path.join(repositoryRoot, manifestPath), "utf8");
    const manifest = JSON.parse(contents);
    return { manifestPath, version: manifest.version };
  }),
);

const expectedVersion = versions[0].version;
const mismatches = versions.filter(({ version }) => version !== expectedVersion);

if (mismatches.length > 0) {
  console.error(`Version mismatch. Expected every package to use ${expectedVersion}:`);
  for (const { manifestPath, version } of versions) {
    console.error(`- ${manifestPath}: ${version}`);
  }
  process.exit(1);
}

console.log(`PASS: ${manifests.length} package manifests use v${expectedVersion}.`);
