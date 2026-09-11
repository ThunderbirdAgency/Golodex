/**
 * Image type detection by content, not by claim.
 *
 * Both the filename and the `Content-Type` header on an upload are chosen by
 * the caller, so neither can decide what a file is. `evil.svg` renamed to
 * `nice.png` and announced as `image/png` would otherwise land in a public
 * bucket and be served back with an image content type — and SVG carries
 * script, on pages that strangers visit.
 *
 * Lives in `lib` rather than in the route so `tests/guards.test.ts` can hold it
 * to the same standard as the rest of the security surface.
 */

export interface SniffedImage {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Identify an image by its leading bytes, or null.
 *
 * The allowlist is deliberately short. SVG can never match: it has no binary
 * signature because it is text, which is exactly why it is not welcome here.
 * GIF and AVIF are absent because nothing in the product needs them, and every
 * format accepted is a format whose decoder has to be trusted.
 */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  // JPEG: FF D8 FF
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes.length > 8 && PNG_MAGIC.every((b, i) => bytes[i] === b)) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP: "RIFF" ....size.... "WEBP"
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}
