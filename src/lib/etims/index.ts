import type { EtimsMode } from "@prisma/client";
import { MockEtimsProvider } from "./mock";
import { OscuEtimsProvider } from "./oscu";
import type { EtimsProvider } from "./types";

export function getEtimsProvider(mode: EtimsMode): EtimsProvider {
  return mode === "OSCU" ? new OscuEtimsProvider() : new MockEtimsProvider();
}

export type { EtimsProvider, EtimsInvoiceInput, EtimsResult } from "./types";
