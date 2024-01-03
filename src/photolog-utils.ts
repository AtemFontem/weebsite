export const PhotoLogMetadata: {[key: string]: {[key: string]: number}} = {
  "2023": { count: 235 },
  "2022": { count: 189 },
  "2021": { count: 41 },
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

