"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body via a portal.
 *
 * The app shell wraps page content in <PageTransition> which animates with a
 * CSS transform. A transformed ancestor becomes the containing block for any
 * descendant `position: fixed` element, so a "fullscreen" fixed overlay ends
 * up clipped to the content column (sidebar + header still showing) instead of
 * the viewport. Portaling to <body> escapes that ancestor so `fixed inset-0`
 * truly covers the whole screen.
 */
export function FullscreenPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
