import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "dist");
const files = [
  ["index.html", "index.html"],
  ["sw.js", "sw.js"],
  ["public/__grok/manifest.webmanifest", "__grok/manifest.webmanifest"],
  ["public/__grok/icon-180.png", "__grok/icon-180.png"],
  ["public/__grok/icon-192.png", "__grok/icon-192.png"],
  ["public/__grok/icon-512.png", "__grok/icon-512.png"],
  ["public/games/drifin-slot-cover.jpg", "games/drifin-slot-cover.jpg"],
];

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "__grok"), { recursive: true });
await mkdir(resolve(output, "games"), { recursive: true });
for (const [source, destination] of files) {
  await copyFile(resolve(root, source), resolve(output, destination));
}
console.log(`Built the standalone NJENGINE page and PWA files in ${output}`);
