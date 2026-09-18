"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install on this phone" — shown only when Chrome offers the install prompt and the
 * app is not already running from the home screen.
 */
export default function InstallCard() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  const install = async () => {
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") setPromptEvent(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand-text">
        <Smartphone className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Install on this phone</span>
        <span className="block text-xs text-muted">Opens full-screen from the home screen, like an app.</span>
      </span>
      <Button size="sm" startIcon={<Download className="h-4 w-4" />} isLoading={installing} onClick={install}>
        Install
      </Button>
    </Card>
  );
}
