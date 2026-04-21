"use client";

import { useEffect } from "react";

export default function ContentProtection() {
  useEffect(() => {
    // Bloque le copier-coller
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onCut  = (e: ClipboardEvent) => e.preventDefault();

    // Bloque le clic droit
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Bloque uniquement sur les images et le contenu de doc
      if (
        target.closest(".protected-content") ||
        target.tagName === "IMG"
      ) {
        e.preventDefault();
      }
    };

    // Bloque le drag des images
    const onDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === "IMG") {
        e.preventDefault();
      }
    };

    document.addEventListener("copy",        onCopy);
    document.addEventListener("cut",         onCut);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart",   onDragStart);

    return () => {
      document.removeEventListener("copy",        onCopy);
      document.removeEventListener("cut",         onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart",   onDragStart);
    };
  }, []);

  return null;
}
