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
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
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
        <label htmlFor="email" className="text-sm font-medium text-white">
          Login Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="auction@collegefest.in"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[var(--gold)] focus:bg-white/8"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-white">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[var(--gold)] focus:bg-white/8"
        />
      </div>

      {state.status === "error" ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.message}
        </div>
      ) : null}

      <SubmitButton configured={configured} />
    </form>
  );
}
