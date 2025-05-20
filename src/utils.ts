import { randomBytes } from "crypto";
export function randomChars(len = 6): string {
  return randomBytes(len).toString("hex");
}

export function isImageFile(mimeType: string): boolean {
  return ["image/gif", "image/jpeg", "image/png", "image/tiff"].includes(
    mimeType,
  );
}
