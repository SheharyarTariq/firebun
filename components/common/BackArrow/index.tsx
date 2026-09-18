"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/utils/cn";

interface BackArrowProps {
  /** The screen one level up (orders list for an order, More for settings…). */
  href: string;
  className?: string;
}

/**
 * Goes "up", not "back": a detail page opened from the counter's confirmation strip or a
 * home-screen shortcut still lands on its list, which is what the header arrow promises.
 */
export default function BackArrow({ href, className }: BackArrowProps) {
  const router = useRouter();
  const handleClick = () => router.push(href);

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={handleClick}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-current transition-colors active:bg-white/10",
        className
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
