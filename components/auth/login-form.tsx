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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#291800] transition hover:bg-[var(--gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" />
          Signing In...
        </>
      ) : (
        <>
          <LogIn className="size-4" />
          Enter Auction Room
        </>
      )}
    </button>
  );
}

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState(signInAction, initialSignInState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]"
        >
          Login Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="auction@collegefest.in"
          className="w-full rounded-xl border border-white/10 bg-[rgba(14,14,19,0.9)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--gold)] focus:bg-black/50"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-white/10 bg-[rgba(14,14,19,0.9)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--gold)] focus:bg-black/50"
        />
      </div>

      {state.status === "error" ? (
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.message}
        </div>
      ) : null}

      <SubmitButton configured={configured} />
    </form>
  );
}
