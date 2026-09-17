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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pt-safe">
        <Image
          src="/assets/icon-192.png"
          alt=""
          width={88}
          height={88}
          priority
          className="rounded-[22px] shadow-lg"
        />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{config.appName}</h1>
          <p className="mt-1 text-sm text-ink-muted">Counter · Inventory · Finance</p>
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
