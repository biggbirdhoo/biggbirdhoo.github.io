// 把 art/textures 里的 PNG 转成网页用的 WebP，输出到 public/textures
// 用法：npm run textures
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "art/textures";
const OUT = "public/textures";

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith(".png"));

for (const f of files) {
  const name = path.basename(f, path.extname(f));
  await sharp(path.join(SRC, f))
    .webp({ quality: 90, alphaQuality: 100, effort: 5 })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log(`✓ ${f} → ${OUT}/${name}.webp`);
}
