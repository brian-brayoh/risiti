export type EtimsInvoiceInput = {
  invoiceNumber: string;
  issuedAt: Date;
  seller: { name: string; kraPin: string; branchId: string; deviceSerial: string | null };
  buyer: { name: string; kraPin: string | null };
  item: { description: string; quantity: number; unitPriceCents: number };
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  vatRateBps: number;
  paymentReference: string | null; // M-Pesa receipt number
};

export type EtimsResult =
  | { ok: true; receiptNo: string; signature: string; verifyUrl: string | null; raw?: unknown }
  | { ok: false; error: string; retryable: boolean };

export interface EtimsProvider {
  readonly name: string;
  readonly isSimulated: boolean;
  submitInvoice(input: EtimsInvoiceInput): Promise<EtimsResult>;
}
