import { cn } from "@/utils/cn";

/** Small uppercase label above a group of cards or rows ("Cash", "Sales", "Price & recipe"). */
export default function SectionHeading({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-caption uppercase text-muted", className)} {...props} />;
}
