"use client"

import clipboardCopy from "clipboard-copy"

/** Copy helper that falls back off the Clipboard API (works on insecure http origins like LAN dev). */
export async function copyToClipboard(text: string): Promise<void> {
  await clipboardCopy(text)
}
