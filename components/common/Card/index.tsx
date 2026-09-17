import { cn } from "@/utils/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

/** Surface container. Pass `p-0` and your own padding for list-style cards. */
export default function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-card border border-border bg-surface p-4", className)}
      {...props}
    />
  );
}
