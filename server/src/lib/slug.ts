import { prisma } from "./prisma";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

/** Generates a unique Tenant.slug from a company name, appending -2/-3/... on collision. */
export async function generateUniqueTenantSlug(companyName: string): Promise<string> {
  const base = slugify(companyName);
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.tenant.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique workspace slug");
}
