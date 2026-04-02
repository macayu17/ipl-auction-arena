import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price in Lakhs with ₹ symbol
 * e.g. 150 → "₹1.50 Cr" or "₹150 L"
 */
export function formatPrice(lakhs: number): string {
  if (lakhs >= 100) {
    return `₹${(lakhs / 100).toFixed(2)} Cr`;
  }
  return `₹${lakhs} L`;
}

/**
 * Format price as short form
 * e.g. 150 → "1.50 Cr"
 */
export function formatPriceShort(lakhs: number): string {
  if (lakhs >= 100) {
    return `${(lakhs / 100).toFixed(2)} Cr`;
  }
  return `${lakhs} L`;
}

/**
 * Format remaining purse
 */
export function formatPurse(total: number, spent: number): string {
  return formatPrice(total - spent);
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "Batsman":
      return "bg-sky-500/18 text-sky-200 border-sky-400/25";
    case "Bowler":
      return "bg-emerald-500/18 text-emerald-200 border-emerald-400/25";
    case "All-Rounder":
      return "bg-amber-500/18 text-amber-100 border-amber-400/25";
    case "Wicket-Keeper":
      return "bg-blue-500/18 text-blue-100 border-blue-400/25";
    default:
      return "bg-white/8 text-slate-300 border-white/10";
  }
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "pool":
      return "bg-sky-500/18 text-sky-200 border-sky-400/25";
    case "active":
      return "bg-amber-500/18 text-amber-100 border-amber-400/25";
    case "sold":
      return "bg-emerald-500/18 text-emerald-200 border-emerald-400/25";
    case "unsold":
      return "bg-rose-500/18 text-rose-200 border-rose-400/25";
    case "rtm":
      return "bg-blue-500/18 text-blue-100 border-blue-400/25";
    default:
      return "bg-white/8 text-slate-300 border-white/10";
  }
}

/**
 * Generate nationality flag emoji
 */
export function getNationalityFlag(nationality: string): string {
  return nationality === "Indian" ? "🇮🇳" : "🌍";
}
