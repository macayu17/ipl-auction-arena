"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={cn(
        "transition disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      disabled={pending || disabled}
      {...props}
    >
      {pending ? pendingLabel ?? "Working..." : children}
    </button>
  );
}
