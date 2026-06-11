"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const COVER_GRADIENTS: Record<string, string> = {
  "gradient:1": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "gradient:2": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "gradient:3": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "gradient:4": "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "gradient:5": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "gradient:6": "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "gradient:7": "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "gradient:8": "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
};

export function coverStyle(cover: string): React.CSSProperties | null {
  if (!cover) return null;
  if (cover.startsWith("gradient:"))
    return { backgroundImage: COVER_GRADIENTS[cover] ?? COVER_GRADIENTS["gradient:1"] };
  return {
    backgroundImage: `url(${cover})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function CoverHeader({
  cover,
  onChange,
  compact,
}: {
  cover: string;
  onChange: (cover: string) => void | Promise<void>;
  compact?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const style = coverStyle(cover);

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      await onChange(url);
      setPicking(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (!style) {
    return (
      <div className="group/cover relative">
        <button
          onClick={() => setPicking(true)}
          className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent group-hover/cover:inline-flex touch:inline-flex"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Add cover
        </button>
        {picking && (
          <Picker
            onPick={async (c) => {
              await onChange(c);
              setPicking(false);
            }}
            onUpload={() => fileRef.current?.click()}
            onClose={() => setPicking(false)}
            uploading={uploading}
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>
    );
  }

  return (
    <div className="group/cover relative -mx-3 -mt-4 md:-mx-8">
      <div
        className={cn("w-full", compact ? "h-32 md:h-40" : "h-40 md:h-56")}
        style={style}
      />
      <div className="absolute bottom-2 right-3 hidden gap-1.5 group-hover/cover:flex touch:flex">
        <button
          onClick={() => setPicking(true)}
          className="rounded-md bg-black/50 px-2 py-1 text-xs text-white backdrop-blur hover:bg-black/70"
        >
          Change cover
        </button>
        <button
          onClick={() => onChange("")}
          className="rounded-md bg-black/50 p-1.5 text-white backdrop-blur hover:bg-black/70"
          aria-label="Remove cover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {picking && (
        <Picker
          onPick={async (c) => {
            await onChange(c);
            setPicking(false);
          }}
          onUpload={() => fileRef.current?.click()}
          onClose={() => setPicking(false)}
          uploading={uploading}
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
    </div>
  );
}

function Picker({
  onPick,
  onUpload,
  onClose,
  uploading,
}: {
  onPick: (cover: string) => void;
  onUpload: () => void;
  onClose: () => void;
  uploading: boolean;
}) {
  return (
    <div
      className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 shadow-lg"
      onMouseLeave={onClose}
    >
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Gradients</p>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(COVER_GRADIENTS).map(([key, css]) => (
          <button
            key={key}
            onClick={() => onPick(key)}
            className="h-10 rounded-md transition-transform hover:scale-105"
            style={{ backgroundImage: css }}
            aria-label={key}
          />
        ))}
      </div>
      <button
        onClick={onUpload}
        disabled={uploading}
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-50"
      >
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Uploading…" : "Upload image"}
      </button>
    </div>
  );
}
