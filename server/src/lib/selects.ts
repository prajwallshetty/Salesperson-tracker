// Prisma `select` for User that omits passwordHash. Several endpoints across the codebase
// return a Salesperson/Order/Visit/etc. with a nested `salesperson.user` via `include: { user:
// true }`, which serializes the bcrypt hash straight into the JSON response - a real credential
// leak, not a style nit. Use `{ select: SAFE_USER_SELECT }` in place of `true` wherever a User
// relation is included in a response.
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
