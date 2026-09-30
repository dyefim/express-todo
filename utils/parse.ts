// TODO: consider using a more robust validation and parsing library
export const parseIntParam = (value: unknown, fallback: number) => {
  const parsed = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const parseStringParam = (
  value: unknown,
  fallback: string | undefined,
) => {
  return typeof value === "string" ? value : fallback;
};
