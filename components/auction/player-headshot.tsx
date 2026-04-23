import Image from "next/image";

import { cn } from "@/lib/utils";

type PlayerHeadshotProps = {
  name: string;
  photoUrl: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  legendary?: boolean;
};

function getInitials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return "PL";
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
}

export function PlayerHeadshot({
  name,
  photoUrl,
  className,
  sizes = "(max-width: 768px) 68vw, 220px",
  priority = false,
  legendary = false,
}: PlayerHeadshotProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        legendary && "legendary-frame",
        className
      )}
    >
      {photoUrl ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.82))]" />
          <Image
            src={photoUrl}
            alt={`${name} headshot`}
            fill
            priority={priority}
            sizes={sizes}
            className="object-contain object-center p-1.5 sm:p-2"
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_58%),linear-gradient(160deg,rgba(255,255,255,0.12),rgba(0,0,0,0.48))]">
          <span className="display-font text-2xl font-bold tracking-wide text-white/85">
            {getInitials(name)}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}
