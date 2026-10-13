import { createHash } from "node:crypto";
import type { EtimsInvoiceInput, EtimsProvider, EtimsResult } from "./types";

/**
 * Simulated eTIMS. Produces deterministic fake receipt numbers so the whole product
 * can be demoed and tested. Invoices issued in this mode are NOT valid tax invoices,
 * and the UI labels them as simulated.
 */
export class MockEtimsProvider implements EtimsProvider {
  readonly name = "Simulated eTIMS";
  readonly isSimulated = true;

  async submitInvoice(input: EtimsInvoiceInput): Promise<EtimsResult> {
    if (!input.seller.kraPin) return { ok: false, error: "Seller KRA PIN missing", retryable: false };
    const signature = createHash("sha256")
      .update(`${input.seller.kraPin}|${input.invoiceNumber}|${input.totalCents}`)
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();
    return {
      ok: true,
      receiptNo: `SIM-${input.seller.branchId}-${input.invoiceNumber}`,
      signature,
      verifyUrl: null,
    };
  }
}
