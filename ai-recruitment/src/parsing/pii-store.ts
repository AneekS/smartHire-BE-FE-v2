import type { PIIMask } from "@/parsing/preprocess.types";
import { PIIMasker } from "@/parsing/PIIMasker";

/** @deprecated Use PIIMasker.encryptForStorage */
export function encryptPiiMask(mask: PIIMask): string | null {
  return PIIMasker.encryptForStorage(mask);
}

/** @deprecated Use PIIMasker.decryptFromStorage */
export function decryptPiiMask(encoded: string | null | undefined): PIIMask | null {
  return PIIMasker.decryptFromStorage(encoded);
}
