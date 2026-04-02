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
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Bowler":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "All-Rounder":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "Wicket-Keeper":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "pool":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "active":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "sold":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "unsold":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "rtm":
      return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

/**
 * Generate nationality flag emoji
 */
export function getNationalityFlag(nationality: string): string {
  return nationality === "Indian" ? "🇮🇳" : "🌍";
}
