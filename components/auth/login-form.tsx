"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signInAction, type SignInState } from "@/app/actions/auth";

const initialSignInState: SignInState = {
  status: "idle",
};

function SubmitButton({ configured }: { configured: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !configured}
      className="glass-button-primary flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle className="w-5 h-5 animate-spin" />
          Signing In...
        </>
      ) : (
        <>
          <LogIn className="w-5 h-5" />
          Enter Auction Room
        </>
      )}
    </button>
  );
}

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState(signInAction, initialSignInState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-white/70 tracking-wide"
        >
          Login Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="auction@collegefest.in"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--gold)] focus:bg-black/50 focus:ring-1 focus:ring-[var(--gold)]/50 transition-all placeholder:text-white/30"
        />
      </div>

      <div className="space-y-2.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-white/70 tracking-wide"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--gold)] focus:bg-black/50 focus:ring-1 focus:ring-[var(--gold)]/50 transition-all placeholder:text-white/30"
        />
      </div>

      {state.status === "error" ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <div className="pt-2">
        <SubmitButton configured={configured} />
      </div>
    </form>
  );
}
