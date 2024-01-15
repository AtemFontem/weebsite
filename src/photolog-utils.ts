export const PhotoLogMetadata: {[key: string]: {[key: string]: number}} = {
  "2024": { count: 7 },
  "2023": { count: 287 },
  "2022": { count: 219 },
  "2021": { count: 47 },
};

export const generateImageSrcForYear = (year: string): string[] => 
  Array.from({length: PhotoLogMetadata[year].count}, (_, i) => `/photolog/${year}/${i + 1}.jpeg`).reverse()

export const extractFileName = (str: string) => {
  const extensionIncluded = /\d+.jpeg/g.exec(str)?.[0] ?? "0";
  return Number(extensionIncluded.substring(0, extensionIncluded.indexOf(".")));
};

export const extractYear = (str: string) => {
  const fileNameIncluded = /\d*\/\d*.jpeg/g.exec(str)?.[0] ?? "0";
  return Number(fileNameIncluded.substring(0, fileNameIncluded.indexOf("/")));
};

export const photos: string[] = [
  ...generateImageSrcForYear("2024"),
  ...generateImageSrcForYear("2023"),
  ...generateImageSrcForYear("2022"),
  ...generateImageSrcForYear("2021"),
  ];
