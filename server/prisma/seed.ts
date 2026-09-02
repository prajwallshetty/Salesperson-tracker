import { PrismaClient, VisitOutcome } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

const CITY_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@salesforcepro.com" },
    update: {},
    create: {
      email: "admin@salesforcepro.com",
      name: "Priya Sharma",
      role: "ADMIN",
      passwordHash: adminPassword,
      phone: "+91 90000 00001",
    },
  });

  const territoryNames = ["North Zone", "South Zone", "East Zone", "West Zone"];
  const territories = [];
  for (const name of territoryNames) {
    const t = await prisma.territory.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} sales territory` },
    });
    territories.push(t);
  }

  const productCatalog = [
    { name: "Premium Cola 500ml", category: "Beverages", unit: "Case (24)", price: 480, taxPercent: 12, discountPercent: 2 },
    { name: "Sparkling Water 1L", category: "Beverages", unit: "Case (12)", price: 360, taxPercent: 12, discountPercent: 0 },
    { name: "Classic Potato Chips 150g", category: "Snacks", unit: "Case (20)", price: 720, taxPercent: 18, discountPercent: 5 },
    { name: "Chocolate Cookies 200g", category: "Snacks", unit: "Case (24)", price: 960, taxPercent: 18, discountPercent: 3 },
    { name: "Full Cream Milk 1L", category: "Dairy", unit: "Case (12)", price: 660, taxPercent: 5, discountPercent: 0 },
    { name: "Greek Yogurt 400g", category: "Dairy", unit: "Case (12)", price: 840, taxPercent: 5, discountPercent: 2 },
    { name: "Herbal Shampoo 400ml", category: "Personal Care", unit: "Case (24)", price: 2160, taxPercent: 18, discountPercent: 4 },
    { name: "Moisturizing Soap Bar", category: "Personal Care", unit: "Case (48)", price: 960, taxPercent: 18, discountPercent: 2 },
    { name: "Basmati Rice 5kg", category: "Grocery", unit: "Bag", price: 620, taxPercent: 5, discountPercent: 0 },
    { name: "Sunflower Oil 5L", category: "Grocery", unit: "Can", price: 890, taxPercent: 5, discountPercent: 1 },
    { name: "Instant Noodles 70g", category: "Snacks", unit: "Case (48)", price: 576, taxPercent: 12, discountPercent: 3 },
    { name: "Green Tea 100 bags", category: "Beverages", unit: "Box", price: 340, taxPercent: 12, discountPercent: 0 },
  ];
  const products = [];
  for (let i = 0; i < productCatalog.length; i++) {
    const p = productCatalog[i];
    const product = await prisma.product.upsert({
      where: { sku: `SKU-${1000 + i}` },
      update: {},
      create: { ...p, sku: `SKU-${1000 + i}`, description: `${p.name} - premium quality, fast moving consumer good.`, isActive: true },
    });
    products.push(product);
  }

  const salespersonSeeds = [
    { name: "Arjun Mehta", code: "SP001", territory: 0, manager: true },
    { name: "Kavya Reddy", code: "SP002", territory: 1, manager: true },
    { name: "Rohan Kapoor", code: "SP003", territory: 0, manager: false },
    { name: "Ananya Iyer", code: "SP004", territory: 1, manager: false },
    { name: "Vikram Singh", code: "SP005", territory: 2, manager: false },
    { name: "Neha Gupta", code: "SP006", territory: 2, manager: false },
    { name: "Karthik Nair", code: "SP007", territory: 3, manager: false },
    { name: "Divya Menon", code: "SP008", territory: 3, manager: false },
  ];

  const salespersonPassword = await bcrypt.hash("Sales@123", 10);
  const salespersons: any[] = [];
  const managers: Record<number, string> = {};

  for (const s of salespersonSeeds) {
    const email = `${s.name.split(" ")[0].toLowerCase()}@salesforcepro.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: s.name, role: "SALESPERSON", passwordHash: salespersonPassword, phone: `+91 9${randInt(100000000, 999999999)}` },
    });
    const existingSp = await prisma.salesperson.findUnique({ where: { userId: user.id } });
    const sp = existingSp
      ? existingSp
      : await prisma.salesperson.create({
          data: {
            userId: user.id,
            employeeCode: s.code,
            territoryId: territories[s.territory].id,
            status: "ACTIVE",
          },
        });
    salespersons.push({ ...sp, _name: s.name, _territoryIdx: s.territory, _isManager: s.manager });
    if (s.manager) managers[s.territory] = sp.id;
  }

  for (const sp of salespersons) {
    if (!sp._isManager && managers[sp._territoryIdx] && managers[sp._territoryIdx] !== sp.id) {
      await prisma.salesperson.update({ where: { id: sp.id }, data: { managerId: managers[sp._territoryIdx] } });
    }
  }

  const customerNamePrefixes = [
    "Sunrise", "Metro", "Green Leaf", "City", "Royal", "Blue Sky", "Golden", "Silver", "Prime", "Elite",
    "Sunshine", "Riverside", "Hilltop", "Central", "Grand", "Star", "Modern", "Classic", "Urban", "Heritage",
    "Diamond", "Crown", "National", "Pioneer", "Unity", "Horizon", "Vista", "Summit", "Ocean", "Valley",
  ];
  const customerSuffixes = ["Mart", "Store", "Supermarket", "Traders", "Retail", "Provisions", "General Store", "Enterprises"];

  const customers: any[] = [];
  for (let i = 0; i < 32; i++) {
    const sp = salespersons[i % salespersons.length];
    const territory = territories[sp._territoryIdx];
    const lat = CITY_CENTER.lat + rand(-0.08, 0.08);
    const lng = CITY_CENTER.lng + rand(-0.08, 0.08);
    const name = `${customerNamePrefixes[i]} ${pick(customerSuffixes)}`;
    const customer = await prisma.customer.create({
      data: {
        name,
        phone: `+91 8${randInt(100000000, 999999999)}`,
        email: `${name.replace(/\s+/g, "").toLowerCase()}@example.com`,
        address: `${randInt(1, 200)}, ${pick(["MG Road", "Brigade Road", "Church Street", "Indiranagar", "Koramangala", "Whitefield", "HSR Layout", "Jayanagar"])}, Bangalore`,
        lat,
        lng,
        territoryId: territory.id,
        salespersonId: sp.id,
      },
    });
    customers.push(customer);
  }

  const now = new Date();
  for (const sp of salespersons) {
    await prisma.target.create({
      data: {
        salespersonId: sp.id,
        period: "MONTHLY",
        periodStart: startOfMonth(now),
        periodEnd: endOfMonth(now),
        targetAmount: randInt(80000, 150000),
      },
    });
  }

  let orderCounter = 1;
  let quotationCounter = 1;

  for (const sp of salespersons) {
    const spCustomers = customers.filter((c) => c.salespersonId === sp.id);
    if (spCustomers.length === 0) continue;

    for (let dayOffset = 9; dayOffset >= 0; dayOffset--) {
      const day = new Date(now);
      day.setDate(day.getDate() - dayOffset);
      if (Math.random() > 0.85) continue; // occasional day off

      const dayStart = startOfDay(day);
      const checkInHour = randInt(8, 9);
      const checkInAt = new Date(dayStart);
      checkInAt.setHours(checkInHour, randInt(0, 59), 0, 0);

      const stopsCount = randInt(3, 6);
      const stops = Array.from({ length: stopsCount }, () => pick(spCustomers));

      let cursorLat = CITY_CENTER.lat + rand(-0.02, 0.02);
      let cursorLng = CITY_CENTER.lng + rand(-0.02, 0.02);
      let cursorTime = new Date(checkInAt);
      let totalDistance = 0;
      const pings: { lat: number; lng: number; speed: number; recordedAt: Date }[] = [];

      pings.push({ lat: cursorLat, lng: cursorLng, speed: 0, recordedAt: new Date(cursorTime) });

      const isToday = dayOffset === 0;

      for (const stop of stops) {
        const legPoints = randInt(6, 12);
        for (let p = 1; p <= legPoints; p++) {
          const frac = p / legPoints;
          const lat = cursorLat + (stop.lat - cursorLat) * frac + rand(-0.0006, 0.0006);
          const lng = cursorLng + (stop.lng - cursorLng) * frac + rand(-0.0006, 0.0006);
          cursorTime = new Date(cursorTime.getTime() + randInt(90, 240) * 1000);
          const speed = rand(8, 45);
          totalDistance += haversineKm(pings[pings.length - 1].lat, pings[pings.length - 1].lng, lat, lng);
          pings.push({ lat, lng, speed, recordedAt: new Date(cursorTime) });
        }
        cursorLat = stop.lat;
        cursorLng = stop.lng;

        const checkInAtStop = new Date(cursorTime);
        const visitDurationMin = randInt(10, 45);
        const checkOutAtStop = new Date(checkInAtStop.getTime() + visitDurationMin * 60000);
        cursorTime = checkOutAtStop;

        const outcomes: VisitOutcome[] = ["ORDER_PLACED", "FOLLOW_UP_REQUIRED", "NOT_INTERESTED", "NO_RESPONSE", "PAYMENT_COLLECTED"];
        const outcome = pick(outcomes);
        const visitStatus = isToday && stop === stops[stops.length - 1] && Math.random() > 0.5 ? "IN_PROGRESS" : "COMPLETED";

        const visit = await prisma.visit.create({
          data: {
            salespersonId: sp.id,
            customerId: stop.id,
            status: visitStatus as any,
            plannedAt: checkInAtStop,
            checkInAt: checkInAtStop,
            checkInLat: stop.lat,
            checkInLng: stop.lng,
            checkOutAt: visitStatus === "COMPLETED" ? checkOutAtStop : null,
            checkOutLat: visitStatus === "COMPLETED" ? stop.lat : null,
            checkOutLng: visitStatus === "COMPLETED" ? stop.lng : null,
            durationMin: visitStatus === "COMPLETED" ? visitDurationMin : null,
            outcome: visitStatus === "COMPLETED" ? outcome : null,
            notes: visitStatus === "COMPLETED" ? pick([
              "Discussed new product range, positive response.",
              "Restocked shelves, customer satisfied.",
              "Requested better credit terms.",
              "Interested in bulk order next month.",
              "Store was busy, quick check-in only.",
            ]) : null,
            createdAt: checkInAtStop,
          },
        });

        if (visitStatus === "COMPLETED" && outcome === "ORDER_PLACED") {
          const itemCount = randInt(1, 4);
          const chosenProducts = Array.from({ length: itemCount }, () => pick(products));
          let subtotal = 0, taxTotal = 0, discountTotal = 0, grandTotal = 0;
          const items = chosenProducts.map((prod) => {
            const qty = randInt(1, 10);
            const lineSubtotal = qty * prod.price;
            const lineDiscount = lineSubtotal * (prod.discountPercent / 100);
            const taxable = lineSubtotal - lineDiscount;
            const lineTax = taxable * (prod.taxPercent / 100);
            const lineTotal = taxable + lineTax;
            subtotal += lineSubtotal;
            discountTotal += lineDiscount;
            taxTotal += lineTax;
            grandTotal += lineTotal;
            return {
              productId: prod.id,
              quantity: qty,
              unitPrice: prod.price,
              discountPercent: prod.discountPercent,
              taxPercent: prod.taxPercent,
              lineTotal,
            };
          });
          const order = await prisma.order.create({
            data: {
              number: `SO-SEED-${orderCounter++}`,
              salespersonId: sp.id,
              customerId: stop.id,
              status: "DELIVERED",
              subtotal,
              taxTotal,
              discountTotal,
              grandTotal,
              createdAt: checkOutAtStop,
              items: { create: items },
            },
          });

          if (Math.random() > 0.4) {
            const collectedAmount = Math.round(grandTotal * rand(0.4, 1));
            await prisma.collection.create({
              data: {
                salespersonId: sp.id,
                customerId: stop.id,
                orderId: order.id,
                amount: collectedAmount,
                method: pick(["CASH", "UPI", "CHEQUE", "BANK_TRANSFER"]),
                collectedAt: checkOutAtStop,
              },
            });
            await prisma.order.update({ where: { id: order.id }, data: { amountCollected: collectedAmount } });
          }
        }

        if (visitStatus === "COMPLETED" && outcome === "PAYMENT_COLLECTED") {
          await prisma.collection.create({
            data: {
              salespersonId: sp.id,
              customerId: stop.id,
              amount: randInt(1000, 15000),
              method: pick(["CASH", "UPI", "CHEQUE"]),
              collectedAt: checkOutAtStop,
            },
          });
        }

        if (visitStatus === "COMPLETED" && outcome === "FOLLOW_UP_REQUIRED") {
          const dueDate = new Date(checkOutAtStop);
          dueDate.setDate(dueDate.getDate() + randInt(-3, 5));
          await prisma.followUp.create({
            data: {
              salespersonId: sp.id,
              customerId: stop.id,
              dueDate,
              notes: "Follow up on pricing discussion",
              status: dueDate < now ? "PENDING" : "PENDING",
            },
          });
        }
      }

      const totalDurationMin = Math.round((cursorTime.getTime() - checkInAt.getTime()) / 60000);

      await prisma.attendance.upsert({
        where: { salespersonId_date: { salespersonId: sp.id, date: dayStart } },
        update: {},
        create: {
          salespersonId: sp.id,
          date: dayStart,
          checkInAt,
          checkInLat: pings[0].lat,
          checkInLng: pings[0].lng,
          checkOutAt: isToday ? null : cursorTime,
          checkOutLat: isToday ? null : cursorLat,
          checkOutLng: isToday ? null : cursorLng,
          totalDistanceKm: Math.round(totalDistance * 100) / 100,
          totalDurationMin,
        },
      });

      await prisma.locationPing.createMany({
        data: pings.map((pt) => ({
          salespersonId: sp.id,
          lat: pt.lat,
          lng: pt.lng,
          speed: pt.speed,
          recordedAt: pt.recordedAt,
        })),
      });

      if (isToday) {
        const last = pings[pings.length - 1];
        await prisma.salesperson.update({
          where: { id: sp.id },
          data: {
            lastLat: last.lat,
            lastLng: last.lng,
            lastSpeed: last.speed,
            lastSeenAt: last.recordedAt,
            isOnline: Math.random() > 0.3,
            fieldWorkStatus: "ACTIVE",
            fieldWorkStartAt: checkInAt,
            todayDistanceKm: Math.round(totalDistance * 100) / 100,
          },
        });
      }
    }
  }

  // A couple of leads not yet converted, spread across salespersons
  const leadNames = ["Fresh Mart Express", "QuickBuy Superstore", "Neighborhood Grocers", "TownSquare Retail", "Corner Shop Co."];
  for (let i = 0; i < leadNames.length; i++) {
    const sp = salespersons[i % salespersons.length];
    await prisma.lead.create({
      data: {
        salespersonId: sp.id,
        name: leadNames[i],
        phone: `+91 7${randInt(100000000, 999999999)}`,
        company: leadNames[i],
        source: pick(["Referral", "Cold Call", "Walk-in", "Trade Show"]),
        status: pick(["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION"]),
        notes: "Potential new account, needs pricing proposal.",
      },
    });
  }

  // A few overdue follow-ups for realism
  for (let i = 0; i < 4; i++) {
    const sp = salespersons[i % salespersons.length];
    const spCustomers = customers.filter((c) => c.salespersonId === sp.id);
    if (spCustomers.length === 0) continue;
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() - randInt(1, 5));
    await prisma.followUp.create({
      data: {
        salespersonId: sp.id,
        customerId: pick(spCustomers).id,
        dueDate,
        notes: "Overdue: confirm reorder quantity",
        status: "PENDING",
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@salesforcepro.com / Admin@123");
  console.log("Salesperson login example: arjun@salesforcepro.com / Sales@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
