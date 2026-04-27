const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}
