export const PhotoLogMetadata: {[key: string]: {[key: string]: number}} = {
  "2023": { count: 234 },
  "2022": { count: 189 },
  "2021": { count: 41 },
};

export const generateImageSrcForYear = (year: string): string[] => 
  Array.from({length: PhotoLogMetadata[year].count}, (_, i) => `/photolog/${year}/${i + 1}.jpeg`).reverse()
