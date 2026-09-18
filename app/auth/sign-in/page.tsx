import type { Metadata } from "next";
import Image from "next/image";
import SignIn from "@/components/auth/sign-in";
import { config } from "@/config";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-ink-foreground">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-6 pt-safe">
        {/* Brand glow behind the icon, echoing the yellow-on-black menu board. */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_180_0/0.28),transparent)]" />
        <Image
          src="/assets/icon-192.png"
          alt=""
          width={88}
          height={88}
          priority
          className="relative rounded-[22px] shadow-lg"
        />
        <div className="relative text-center">
          <h1 className="text-3xl font-bold tracking-tight">{config.appName}</h1>
          <div aria-hidden className="mx-auto mt-2 h-0.5 w-10 rounded-full bg-gradient-to-r from-brand to-brand-strong" />
          <p className="mt-2 text-sm text-ink-muted">Counter · Inventory · Finance</p>
        </div>
      </div>

      <section className="rounded-t-[28px] bg-surface px-5 pt-7 text-foreground pb-safe">
        <div className="mx-auto w-full max-w-sm pb-8">
          <h2 className="text-xl font-semibold">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-muted">Sign in with your staff account.</p>
          <SignIn next={next} />
        </div>
      </section>
    </main>
  );
}
