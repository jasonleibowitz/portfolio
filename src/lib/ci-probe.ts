// Temporary CI gate probe -- deliberately breaks exactly one gate at a time.
// ESLint objects to the unused variable; Prettier and tsc do not.
export function probe(): number {
  const unused = 'never read';
  return 1;
}
