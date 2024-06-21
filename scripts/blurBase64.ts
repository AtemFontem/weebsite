import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import type { PhotoLogImage } from "../src/photolog-utils";
import { PhotoLogMetadata } from "../src/photolog-utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// use blurred, low-res images as placeholder
// use standard quality images for the photolog view
// use high quality images for the view pages
export const generateImageSrcForYear = (year: string): PhotoLogImage[] =>
  Array.from({ length: PhotoLogMetadata[year].count }, (_, i) => {
    const sq = `/photolog/sq/${year}/${i + 1}.jpeg`;
    const hq = `/photolog/hq/${year}/${i + 1}.jpeg`;
    const blurBase64 = fs.readFileSync(
      path.resolve(__dirname, `../public/photolog/blur/${year}/${i + 1}.jpeg`),
      { encoding: "base64" },
    );
    const blur = `data:image/jpeg;base64,${blurBase64}`;

    return {
      blur,
      sq,
      hq,
    };
  }).reverse();

export const photos: PhotoLogImage[] = [
  ...generateImageSrcForYear("2023"),
  ...generateImageSrcForYear("2022"),
  ...generateImageSrcForYear("2021"),
];

fs.writeFileSync(
  path.resolve(__dirname, "../src/photolog.ts"),
  `export const photos = ${JSON.stringify(photos)}`,
  { flag: "w" },
);
