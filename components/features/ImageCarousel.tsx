"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface CarouselImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export default function ImageCarousel({ images }: { images: CarouselImage[] }) {
  const [current,   setCurrent]   = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const prev = useCallback(() => {
    setDirection("left");
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setDirection("right");
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  const goTo = useCallback((i: number, cur: number) => {
    setDirection(i > cur ? "right" : "left");
    setCurrent(i);
  }, []);

  if (!images.length) return null;

  if (images.length === 1) {
    return (
      <div className="max-w-[600px]">
        <div className="rounded-lg border border-border bg-surface flex items-center justify-center p-3">
          <Image
            src={images[0].src}
            alt={images[0].alt}
            width={images[0].width}
            height={images[0].height}
            className="w-auto h-auto max-w-[576px] max-h-[510px] object-contain rounded-md"
          />
        </div>
      </div>
    );
  }

  const prevIdx = (current - 1 + images.length) % images.length;
  const nextIdx = (current + 1) % images.length;

  return (
    <div className="relative w-full select-none">

      {/* Bande principale — 3 colonnes, bg unique */}
      <div
        className="flex items-stretch w-full rounded-lg overflow-hidden border border-border bg-surface"
        style={{ height: 480 }}
      >

        {/* Gauche — image ancrée à droite, 3/4 cachée */}
        <button
          onClick={prev}
          aria-label="Précédent"
          className="flex-none relative overflow-hidden cursor-pointer"
          style={{ width: 90 }}
        >
          <div
            className="absolute top-1/2 right-0 -translate-y-1/2"
            style={{ filter: "blur(0.8px)" }}
          >
            <Image
              src={images[prevIdx].src}
              alt={images[prevIdx].alt}
              width={images[prevIdx].width}
              height={images[prevIdx].height}
              className="w-auto object-contain"
              style={{ maxHeight: 420, maxWidth: 150 }}
            />
          </div>
        </button>

        {/* Centre — image active */}
        <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
          <Image
            key={current}
            src={images[current].src}
            alt={images[current].alt}
            width={images[current].width}
            height={images[current].height}
            className={`w-auto h-auto object-contain rounded-sm ${
              direction === "right" ? "carousel-in-right" : "carousel-in-left"
            }`}
            style={{ maxWidth: "100%", maxHeight: 440 }}
          />
        </div>

        {/* Droite — image ancrée à gauche, 3/4 cachée */}
        <button
          onClick={next}
          aria-label="Suivant"
          className="flex-none relative overflow-hidden cursor-pointer"
          style={{ width: 90 }}
        >
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2"
            style={{ filter: "blur(0.8px)" }}
          >
            <Image
              src={images[nextIdx].src}
              alt={images[nextIdx].alt}
              width={images[nextIdx].width}
              height={images[nextIdx].height}
              className="w-auto object-contain"
              style={{ maxHeight: 420, maxWidth: 150 }}
            />
          </div>
        </button>

      </div>

      {/* Compteur — collé à droite sous le carousel */}
      <div className="flex items-center justify-end mt-2">
        <span className="text-xs text-muted tabular-nums font-medium">
          {current + 1} / {images.length}
        </span>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, current)}
            aria-label={`Image ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-5 h-1.5 bg-primary"
                : "w-1.5 h-1.5 bg-border hover:bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
