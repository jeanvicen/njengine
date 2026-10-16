import { copyFile, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
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
  ["public/games/corrida-lunar-cover.jpg", "games/corrida-lunar-cover.jpg"],
  ["public/sounds/njengine-boot.mp3", "sounds/njengine-boot.mp3"],
];

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "__grok"), { recursive: true });
await mkdir(resolve(output, "games"), { recursive: true });
await mkdir(resolve(output, "sounds"), { recursive: true });
for (const [source, destination] of files) {
  await copyFile(resolve(root, source), resolve(output, destination));
}
const gameRoot = resolve(root, "games/corrida-lunar");
execFileSync("npm", ["ci", "--no-audit", "--no-fund"], { cwd: gameRoot, stdio: "inherit" });
execFileSync("npm", ["run", "build"], { cwd: gameRoot, stdio: "inherit" });
console.log(`Built NJENGINE and embedded Corrida Lunar in ${output}`);
