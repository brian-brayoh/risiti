/**
 * Demo data: npx prisma db seed
 * Login: demo@risiti.test / demo12345
 */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { ingestC2BPayment, processPayment } from "../src/lib/engine";

async function main() {
  const email = "demo@risiti.test";
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { name: "Demo Owner", email, passwordHash: await bcrypt.hash("demo12345", 10) },
  });

  const business = await db.business.upsert({
    where: { shortcode: "600984" },
    update: {},
    create: {
      name: "Kamau Hardware Ltd",
      kraPin: "P051234567X",
      shortcode: "600984",
      shortcodeType: "PAYBILL",
      itemDescription: "Hardware supplies",
      invoicePrefix: "KH",
      phone: "0712 000 000",
      address: "Kenyatta Ave, Nakuru",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const customers = [
    { name: "Baraka Builders", accountRef: "BB01", phone: "254711111111", kraPin: "P051111111A" },
    { name: "Achieng Otieno", accountRef: "AO22", phone: "254722222222" },
    { name: "Mutua Construction", accountRef: "MC07", phone: "254733333333", kraPin: "P052222222B" },
  ];
  for (const c of customers) {
    await db.customer.upsert({
      where: { businessId_accountRef: { businessId: business.id, accountRef: c.accountRef } },
      update: {},
      create: { businessId: business.id, ...c },
    });
  }

  const sample = [
    ["BB01", 23200, "254711111111", "BARAKA"],
    ["ao22", 1160, "254722222222", "ACHIENG"],
    ["MC07", 58000, "254733333333", "PETER"],
    ["XYZ9", 580, "254744444444", "JAMES"], // unmatched -> walk-in
    ["BB01", 9860, "254711111111", "BARAKA"],
  ] as const;

  let n = 0;
  for (const [ref, amt, phone, name] of sample) {
    n++;
    const d = new Date(Date.now() - n * 86400_000 + 3 * 3600_000);
    const p2 = (x: number) => String(x).padStart(2, "0");
    const t = `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}00`;
    const res = await ingestC2BPayment(business.webhookToken, {
      TransactionType: "Pay Bill", TransID: `SEED${String(n).padStart(6, "0")}`, TransTime: t,
      TransAmount: String(amt), BusinessShortCode: "600984", BillRefNumber: ref, MSISDN: phone, FirstName: name,
    });
    if (res.ok) await processPayment(res.paymentId); // idempotent - safe to re-run the seed
  }
  console.log("Seeded. Login: demo@risiti.test / demo12345");
}

main().finally(() => db.$disconnect());
