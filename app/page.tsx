import { redirect } from "next/navigation";
import { routes } from "@/utils/routes";

// The root route has no content of its own; the counter (POS) is the home screen.
export default function Home() {
  redirect(routes.ui.pos);
}
