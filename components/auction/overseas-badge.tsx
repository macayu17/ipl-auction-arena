import { Plane } from "lucide-react";

type OverseasBadgeProps = {
  nationality: string;
  className?: string;
};

/**
 * Renders a small airplane icon if player is from overseas.
 * Returns null for Indian players.
 */
export function OverseasBadge({ nationality, className = "" }: OverseasBadgeProps) {
  if (nationality === "Indian") return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300 ${className}`}
      title="Overseas player"
    >
      <Plane className="w-3 h-3" />
    </span>
  );
}
