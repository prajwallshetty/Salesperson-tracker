export interface LineInput {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

export interface LineComputed extends LineInput {
  lineSubtotal: number;
  lineDiscount: number;
  lineTax: number;
  lineTotal: number;
}

export function computeLine(input: LineInput): LineComputed {
  const lineSubtotal = input.quantity * input.unitPrice;
  const lineDiscount = lineSubtotal * (input.discountPercent / 100);
  const taxable = lineSubtotal - lineDiscount;
  const lineTax = taxable * (input.taxPercent / 100);
  const lineTotal = taxable + lineTax;
  return { ...input, lineSubtotal, lineDiscount, lineTax, lineTotal };
}

export function computeDocumentTotals(lines: LineComputed[]) {
  const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  const discountTotal = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const taxTotal = lines.reduce((s, l) => s + l.lineTax, 0);
  const grandTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { subtotal, discountTotal, taxTotal, grandTotal };
}
