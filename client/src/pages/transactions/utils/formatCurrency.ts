const formatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatIndianCurrency = (value: number): string =>
  formatter.format(value);

export const parseIndianCurrency = (value: string): number =>
  Number(value.replace(/,/g, "")) || 0;