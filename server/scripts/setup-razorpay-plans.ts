// One-time (or re-runnable) setup: creates a Razorpay Plan for every SubscriptionPlan tier that
// doesn't have one yet, for both billing intervals, and stores the resulting Razorpay plan ids
// back on SubscriptionPlan. Run manually against a real Razorpay account (test mode while
// developing, live mode in production - never mix the two, see RAZORPAY_KEY_ID/KEY_SECRET in
// .env.example) whenever a new plan tier is added or before enabling checkout for the first
// time:
//
//   npx tsx scripts/setup-razorpay-plans.ts
//
// Deliberately does NOT run automatically at server startup or inside any request handler -
// the task's own instruction is "do not create Razorpay plans dynamically on every checkout;
// create/manage them through a controlled admin/setup process." Safe to re-run: a plan that
// already has both razorpayMonthlyPlanId/razorpayYearlyPlanId set is skipped, never re-created
// (Razorpay has no "get or create a plan with this name" API, so re-creating would just produce
// duplicate Plan objects on their side).
import { prisma } from "../src/lib/prisma";
import { getRazorpay, isRazorpayConfigured } from "../src/lib/razorpay";

async function main() {
  if (!isRazorpayConfigured()) {
    console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set - nothing to do.");
    process.exit(1);
  }
  const razorpay = getRazorpay();

  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true, monthlyPrice: { gt: 0 } } });
  for (const plan of plans) {
    let monthlyId = plan.razorpayMonthlyPlanId;
    let yearlyId = plan.razorpayYearlyPlanId;

    if (!monthlyId) {
      const created = await razorpay.plans.create({
        period: "monthly",
        interval: 1,
        item: {
          name: `Sales Grid - ${plan.name} (Monthly)`,
          amount: Math.round(plan.monthlyPrice * 100), // Razorpay amounts are in paise
          currency: "INR",
        },
        notes: { planKey: plan.key, interval: "MONTHLY" },
      });
      monthlyId = created.id;
      console.log(`Created Razorpay monthly plan for ${plan.key}: ${monthlyId}`);
    }

    if (!yearlyId && plan.annualPrice != null) {
      const created = await razorpay.plans.create({
        period: "yearly",
        interval: 1,
        item: {
          name: `Sales Grid - ${plan.name} (Yearly)`,
          amount: Math.round(plan.annualPrice * 100),
          currency: "INR",
        },
        notes: { planKey: plan.key, interval: "YEARLY" },
      });
      yearlyId = created.id;
      console.log(`Created Razorpay yearly plan for ${plan.key}: ${yearlyId}`);
    }

    if (monthlyId !== plan.razorpayMonthlyPlanId || yearlyId !== plan.razorpayYearlyPlanId) {
      await prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { razorpayMonthlyPlanId: monthlyId, razorpayYearlyPlanId: yearlyId },
      });
    }
  }

  console.log("Done.");
}

main().finally(() => prisma.$disconnect());
