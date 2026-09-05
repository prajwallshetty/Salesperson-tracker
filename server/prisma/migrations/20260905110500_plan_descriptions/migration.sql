-- Additive data fix: sets the marketing description shown on the pricing page for each plan.
-- No schema change, no other column touched.
UPDATE "SubscriptionPlan" SET "description" = 'Perfect for small teams getting started' WHERE "key" = 'STARTER';
UPDATE "SubscriptionPlan" SET "description" = 'Best for growing sales teams' WHERE "key" = 'GROWTH';
UPDATE "SubscriptionPlan" SET "description" = 'For established sales organizations' WHERE "key" = 'PROFESSIONAL';
UPDATE "SubscriptionPlan" SET "description" = 'For large field sales teams' WHERE "key" = 'BUSINESS';
UPDATE "SubscriptionPlan" SET "description" = 'For large organizations with multiple teams' WHERE "key" = 'SCALE';
UPDATE "SubscriptionPlan" SET "description" = 'Built for your organization. Custom solutions for your unique needs.' WHERE "key" = 'ENTERPRISE';
