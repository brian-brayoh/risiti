import { test } from "node:test";
import assert from "node:assert/strict";
import { splitVat, toCents, formatKes } from "../src/lib/money";
import { matchCustomer, normalizeRef } from "../src/lib/matching";
import { normalizePhone } from "../src/lib/phone";
import { parseTransTime, c2bPayloadSchema, normalizeC2B } from "../src/lib/mpesa";
import { monthRange, toCsv } from "../src/lib/csv";

test("VAT split is exact and VAT-inclusive", () => {
  assert.deepEqual(splitVat(116000, 1600, true), { subtotalCents: 100000, vatCents: 16000, totalCents: 116000 });
  // awkward amount: parts must always add back to the total
  for (const total of [1, 99, 100, 101, 5799, 123457, 9999999]) {
    const s = splitVat(total, 1600, true);
    assert.equal(s.subtotalCents + s.vatCents, total);
  }
  assert.deepEqual(splitVat(5000, 1600, false), { subtotalCents: 5000, vatCents: 0, totalCents: 5000 });
});

test("money parsing", () => {
  assert.equal(toCents("1,160.00"), 116000);
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.throws(() => toCents("abc"));
  assert.match(formatKes(116000), /^KES 1,160\.00$/);
});

test("phone normalisation", () => {
  assert.equal(normalizePhone("0712 345 678"), "254712345678");
  assert.equal(normalizePhone("+254 712345678"), "254712345678");
  assert.equal(normalizePhone("0110123456"), "254110123456");
  assert.equal(normalizePhone("2547xx"), null);
  assert.equal(normalizePhone("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"), null); // hashed MSISDN
});

test("customer matching", () => {
  const cs = [
    { id: "a", accountRef: "BB01", phone: "254711111111" },
    { id: "b", accountRef: "AO22", phone: "254722222222" },
    { id: "c", accountRef: "XX01", phone: "254722222222" },
  ];
  assert.deepEqual(matchCustomer(" bb 01 ", null, cs), { customerId: "a", method: "ACCOUNT_REF" });
  assert.deepEqual(matchCustomer("", "0711111111", cs), { customerId: "a", method: "PHONE" });
  // ambiguous phone -> no guess
  assert.deepEqual(matchCustomer(null, "254722222222", cs), { customerId: null, method: "NONE" });
  // unknown ref falls back to phone
  assert.deepEqual(matchCustomer("NOPE", "254711111111", cs), { customerId: "a", method: "PHONE" });
  assert.equal(normalizeRef("   "), null);
});

test("Daraja payload parsing (EAT -> UTC)", () => {
  assert.equal(parseTransTime("20261012164000").toISOString(), "2026-10-12T13:40:00.000Z");
  const p = c2bPayloadSchema.parse({
    TransactionType: "Pay Bill", TransID: "SJK3ABC123", TransTime: "20261012164000", TransAmount: "1160.00",
    BusinessShortCode: 600984, BillRefNumber: "BB01", MSISDN: "254711111111", FirstName: "JOHN", MiddleName: "", LastName: "DOE",
  });
  const n = normalizeC2B(p);
  assert.equal(n.amountCents, 116000);
  assert.equal(n.shortcode, "600984");
  assert.equal(n.payerName, "JOHN DOE");
});

test("month range and csv escaping", () => {
  const [a, b] = monthRange("2026-10");
  assert.equal(a.toISOString(), "2026-09-30T21:00:00.000Z");
  assert.equal(b.toISOString(), "2026-10-31T21:00:00.000Z");
  assert.equal(toCsv([["a,b", 'say "hi"', null]]), '"a,b","say ""hi""",');
});
