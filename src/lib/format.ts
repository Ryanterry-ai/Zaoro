export function formatPrice(paise: number, symbol = 'Rs. '): string {
  return `${symbol}${(paise / 100).toLocaleString('en-IN')}`;
}

