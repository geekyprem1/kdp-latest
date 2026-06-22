/**
 * Puppeteer PDF renderer.
 *
 * Renders an HTML string to a print-ready PDF at an exact physical page size.
 * We drive the page size from CSS `@page` (preferCSSPageSize) and disable
 * Puppeteer margins so the output matches the KDP spec to the inch.
 *
 * A single browser instance is reused across renders (cheap browser pool) so
 * this is safe to call repeatedly from a script or, later, a background task.
 */

import puppeteer, { type Browser } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

export interface RenderOptions {
  widthIn: number;
  heightIn: number;
}

export interface PngOptions {
  widthIn: number;
  heightIn: number;
  /** Render resolution for the preview image. Default 150 DPI. */
  dpi?: number;
}

const CSS_PX_PER_IN = 96;

/**
 * Render a single-page HTML document to a PNG at a physical size — used for
 * preview screenshots. The page is sized in CSS inches; deviceScaleFactor
 * upscales to the requested DPI.
 */
export async function renderPng(
  html: string,
  opts: PngOptions
): Promise<Uint8Array> {
  const dpi = opts.dpi ?? 150;
  const width = Math.round(opts.widthIn * CSS_PX_PER_IN);
  const height = Math.round(opts.heightIn * CSS_PX_PER_IN);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: dpi / CSS_PX_PER_IN,
    });
    await page.setContent(html, { waitUntil: "load" });
    return await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });
  } finally {
    await page.close();
  }
}

/**
 * Render HTML to a PDF buffer at the given physical size.
 * Fonts are embedded by Chromium automatically.
 */
export async function renderPdf(
  html: string,
  opts: RenderOptions
): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      width: `${opts.widthIn}in`,
      height: `${opts.heightIn}in`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return pdf;
  } finally {
    await page.close();
  }
}
