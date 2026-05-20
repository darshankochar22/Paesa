export const formatIndianCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseIndianCurrency = (value: string): number => {
  return Number(value.replace(/,/g, '')) || 0;
};
