export const PhotoLogMetadata: { [key: string]: { [key: string]: number } } = {
  "2024": { count: 11 },
  "2023": { count: 11 },
  "2022": { count: 11 },
  "2021": { count: 11 },
};

export type PhotoLogImage = {
  blur: string;
  sq: string;
  hq: string;
};

export const extractFileName = (str: string) => {
  const extensionIncluded = /\d+.jpeg/g.exec(str)?.[0] ?? "0";
  return Number(extensionIncluded.substring(0, extensionIncluded.indexOf(".")));
};

export const extractYear = (str: string) => {
  const fileNameIncluded = /\d*\/\d*.jpeg/g.exec(str)?.[0] ?? "0";
  return Number(fileNameIncluded.substring(0, fileNameIncluded.indexOf("/")));
};

// Generate a shuffled array of unique random numbers (0 to size-1)
const generateUniqueRandomNumbers = (size: number): number[] => {
  // Step 1: Create an array of all numbers from 0 to size-1
  const arr = Array.from({ length: size }, (_, i) => i);
  
  // Step 2: Shuffle the array using Fisher-Yates algorithm
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap elements
  }
  
  return arr;
};

const size = Object.values(PhotoLogMetadata).reduce(
  (acc, curr) => (acc += curr.count),
  0,
);

export const rands = generateUniqueRandomNumbers(size);