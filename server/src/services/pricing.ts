import { prisma } from "../lib/prisma";

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

export interface ResolvedPrice {
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  source: "customer" | "territory" | "override" | "product";
}

/**
 * Resolves unit price/discount/tax for a batch of {productId} line items against an optional
 * customer, applying the most-specific-wins PriceList override (customer-specific >
 * territory-specific (derived from the customer's territory) > a generic override with neither
 * customerId nor territoryId set > the Product's own price/discountPercent/taxPercent).
 *
 * Batches the Product and PriceList lookups into one query each regardless of item count, so
 * this is safe to call from quotation/order creation without introducing N+1 queries.
 *
 * IMPORTANT: when a product has no matching PriceList row at all, this returns exactly
 * product.price/discountPercent/taxPercent - identical to the pre-pricing-table behavior - so
 * wiring this in does not change existing quotation/order totals for any product without an
 * override configured.
 */
export async function resolvePricingForItems(
  productIds: string[],
  customerId: string | null | undefined,
  at: Date = new Date()
) {
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let territoryId: string | null = null;
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { territoryId: true } });
    territoryId = customer?.territoryId ?? null;
  }

  const priceLists = productIds.length
    ? await prisma.priceList.findMany({
        where: {
          productId: { in: productIds },
          isActive: true,
          effectiveFrom: { lte: at },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
        },
      })
    : [];

  const byProduct = new Map<string, typeof priceLists>();
  for (const pl of priceLists) {
    const arr = byProduct.get(pl.productId) ?? [];
    arr.push(pl);
    byProduct.set(pl.productId, arr);
  }

  function resolve(productId: string): { product: (typeof products)[number]; resolved: ResolvedPrice } | null {
    const product = productMap.get(productId);
    if (!product) return null;
    const candidates = byProduct.get(productId) ?? [];
    const customerRow = customerId ? candidates.find((c) => c.customerId === customerId) : undefined;
    const territoryRow = territoryId
      ? candidates.find((c) => c.territoryId === territoryId && !c.customerId)
      : undefined;
    const genericRow = candidates.find((c) => !c.customerId && !c.territoryId);
    const chosen = customerRow ?? territoryRow ?? genericRow;

    if (chosen) {
      return {
        product,
        resolved: {
          unitPrice: chosen.price,
          discountPercent: chosen.discountPercent,
          taxPercent: chosen.taxPercent,
          source: customerRow ? "customer" : territoryRow ? "territory" : "override",
        },
      };
    }
    return {
      product,
      resolved: {
        unitPrice: product.price,
        discountPercent: product.discountPercent,
        taxPercent: product.taxPercent,
        source: "product",
      },
    };
  }

  return { resolve };
}
