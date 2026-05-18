import { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "strong" | "subtle";
  interactive?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, variant = "default", interactive, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-xl overflow-hidden",
          variant === "default" && "glass",
          variant === "strong" && "glass-strong",
          variant === "subtle" &&
            "bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]",
          interactive &&
            "transition-all duration-200 hover:bg-[var(--color-bg-card-hover)] hover:border-[var(--color-border-default)] hover:-translate-y-0.5 cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";
