export function sum(arr: number[]) {
  return arr.reduce((acc, i) => acc + i, 0);
}

// Example usage
// const array1 = [1, 2, 3];
// const array2 = ['a', 'b', 'c', 'd'];
// const interleaved = interleaveArrays(array1, array2); // [1, 'a', 2, 'b', 3, 'c', 'd']
export function interleaveArrays<T>(arr1: T[], arr2: T[]): T[] {
  const interleavedArray: T[] = [];

  // Determine the length of the shorter array
  const shortestLength = Math.min(arr1.length, arr2.length);

  // Interleave the elements of the two arrays
  for (let i = 0; i < shortestLength; i++) {
    interleavedArray.push(arr1[i]);
    interleavedArray.push(arr2[i]);
  }

  // Add any remaining elements from the longer array
  if (arr1.length > arr2.length) {
    interleavedArray.push(...arr1.slice(shortestLength));
  } else if (arr2.length > arr1.length) {
    interleavedArray.push(...arr2.slice(shortestLength));
  }

  return interleavedArray;
}

export function groupOfItems<T>({
  step,
  arr,
  numberItemOfGroup,
}: {
  step: number;
  numberItemOfGroup: number;
  arr: T[];
}) {
  const result: T[][] = [];
  for (let i = 0; i < arr.length - step; i = i + step) {
    result.push(arr.slice(i, i + numberItemOfGroup));
  }
  return result;
}

export function random({ min, max }: { min: number; max: number }) {
  return Math.random() * (max - min) + min;
}

