"use client";

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
 *
 * Portals synchronously on the client (guarded for SSR) rather than after a
 * mount effect: the children — including any ref'd container an editor needs
 * to initialise against (Univer, Excalidraw) — must exist in the DOM in the
 * same commit, before the consuming component's init effect runs. A
 * mount-effect delay would leave that ref null and the editor never inits.
 */
export function FullscreenPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
