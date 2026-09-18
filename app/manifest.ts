import type { MetadataRoute } from "next";
import { config } from "@/config";
import { routes } from "@/utils/routes";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: config.appName,
    short_name: config.appName,
    description: "Counter, inventory and finance for Fire Bun.",
    lang: "en",
    categories: ["business", "food"],
    start_url: routes.ui.pos,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5f2",
    theme_color: "#141210",
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/assets/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
