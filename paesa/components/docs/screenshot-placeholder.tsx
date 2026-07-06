"use client";

import { Image as ImageIcon } from "lucide-react";
import NextImage from "next/image";
import { useState } from "react";

export function ScreenshotPlaceholder({
  caption,
  src,
  width = 2560,
  height = 1600,
  aspect = "aspect-video",
}: {
  caption: string;
  src?: string;
  width?: number;
  height?: number;
  aspect?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <figure className="space-y-3">
        <NextImage
          src={src}
          alt={caption}
          width={width}
          height={height}
          onError={() => setFailed(true)}
          className="w-full h-auto rounded-2xl border border-zinc-200"
        />
        <figcaption className="text-xs text-zinc-400 leading-relaxed text-center">
          {caption}
        </figcaption>
      </figure>
    );
  }

  return (
    <div
      className={`${aspect} rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 flex flex-col items-center justify-center gap-2.5 px-6 text-center`}
    >
      <ImageIcon size={20} strokeWidth={1.5} className="text-zinc-300" />
      <p className="text-xs text-zinc-400 leading-relaxed">{caption}</p>
    </div>
  );
}
