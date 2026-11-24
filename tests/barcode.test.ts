import { describe, expect, it } from "vitest";
import bwipjs from "bwip-js/node";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";

type Code128Pattern = { sbs: number[] };

/** Rekonstruksi piksel dari pola modul CODE128 agar bisa didekode ZXing di Node. */
function pixelsFromPattern(pattern: number[], quietZone = 10, height = 40) {
  const modules = pattern.reduce((sum, width) => sum + width, 0);
  const width = modules + quietZone * 2;
  const luminances = new Uint8ClampedArray(width * height).fill(255);

  for (let y = 0; y < height; y += 1) {
    let x = quietZone;
    pattern.forEach((run, index) => {
      const value = index % 2 === 0 ? 0 : 255;
      for (let pixel = 0; pixel < run; pixel += 1) {
        luminances[y * width + x] = value;
        x += 1;
      }
    });
  }

  return { luminances, width, height };
}

describe("label barcode produk", () => {
  it("menghasilkan CODE128 yang bisa didekode kembali", () => {
    const sku = "KS-AMER-001";
    const [symbol] = bwipjs.raw({ bcid: "code128", text: sku }) as Code128Pattern[];
    const { luminances, width, height } = pixelsFromPattern(symbol.sbs);

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminances, width, height)));
    const decoded = new MultiFormatReader().decode(bitmap, hints);

    expect(decoded.getText()).toBe(sku);
  });
});
