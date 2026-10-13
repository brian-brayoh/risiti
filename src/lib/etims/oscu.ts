import type { EtimsInvoiceInput, EtimsProvider, EtimsResult } from "./types";

/**
 * Real KRA eTIMS via OSCU (Online Sales Control Unit).
 *
 * Deliberately NOT implemented with guessed endpoints. Going live requires:
 *   1. Applying to KRA for eTIMS OSCU integration / integrator approval
 *   2. Receiving KRA's OSCU technical specification + sandbox credentials
 *   3. Device initialisation for each taxpayer branch (gives the device serial / comm key)
 *   4. Passing KRA's integration tests
 *
 * Implement `submitInvoice` against that spec: map EtimsInvoiceInput to KRA's sales payload,
 * POST it, and return the receipt number + signature (+ QR/verify URL) from the response.
 * Everything else in Risiti (numbering, retries, SMS, receipts) already works with this interface.
 */
export class OscuEtimsProvider implements EtimsProvider {
  readonly name = "KRA eTIMS (OSCU)";
  readonly isSimulated = false;

  async submitInvoice(input: EtimsInvoiceInput): Promise<EtimsResult> {
    if (!input.seller.deviceSerial) {
      return { ok: false, error: "eTIMS device not initialised for this business (device serial missing)", retryable: false };
    }
    return {
      ok: false,
      error: "OSCU integration not implemented yet - see src/lib/etims/oscu.ts",
      retryable: false,
    };
  }
}
