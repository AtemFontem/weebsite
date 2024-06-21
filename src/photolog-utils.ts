export const PhotoLogMetadata: { [key: string]: { [key: string]: number } } = {
  "2023": { count: 253 },
  "2022": { count: 234 },
  "2021": { count: 45 },
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

const getRandomInt = (max: number, currIndex: number): number => {
  const rand = Math.floor(Math.random() * max);
  // don't return the same index
  return rand == currIndex ? getRandomInt(max, currIndex) : rand;
};

const generateUniqueRandomNumbers = (
  size: number,
  currIndex: number,
  rands: number[],
): number[] => {
  if (currIndex < size) {
    const rand = getRandomInt(size, currIndex);

    if (rands.includes(rand)) {
      // repeat of something that already exists, try again
      return generateUniqueRandomNumbers(size, currIndex, rands);
    }

    return generateUniqueRandomNumbers(size, currIndex + 1, [...rands, rand]);
  }

  return rands;
};

const size = Object.values(PhotoLogMetadata).reduce(
  (acc, curr) => (acc += curr.count),
  0,
);

export const rands = generateUniqueRandomNumbers(size, 0, []);
