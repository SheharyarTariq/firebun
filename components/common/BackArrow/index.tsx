"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/utils/cn";

interface BackArrowProps {
  /** Where to go when there is no history to go back to (e.g. opened from the home screen). */
  href: string;
  className?: string;
}

export default function BackArrow({ href, className }: BackArrowProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(href);
    }
  };

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
