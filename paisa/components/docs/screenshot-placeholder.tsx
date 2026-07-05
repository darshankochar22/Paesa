import { Image as ImageIcon } from "lucide-react";

export function ScreenshotPlaceholder({
  caption,
  aspect = "aspect-video",
}: {
  caption: string;
  aspect?: string;
}) {
  return (
    <div
      className={`${aspect} rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 flex flex-col items-center justify-center gap-2.5 px-6 text-center`}
    >
      <ImageIcon size={20} strokeWidth={1.5} className="text-zinc-300" />
      <p className="text-xs text-zinc-400 leading-relaxed">{caption}</p>
    </div>
  );
}
