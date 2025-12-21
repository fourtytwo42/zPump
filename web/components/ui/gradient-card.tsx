import * as React from "react";
import { cn } from "@/lib/utils";

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: "purple" | "blue" | "pink" | "green" | "yellow" | "cyan";
}

const gradientClasses = {
  purple: "from-blue-500/20 via-indigo-500/20 to-cyan-500/20",
  blue: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
  pink: "from-indigo-500/20 via-blue-500/20 to-cyan-500/20",
  green: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
  yellow: "from-amber-500/20 via-orange-500/20 to-yellow-500/20",
  cyan: "from-cyan-500/20 via-blue-500/20 to-indigo-500/20",
};

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, gradient = "purple", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl p-6 bg-gradient-to-br",
          gradientClasses[gradient],
          "backdrop-blur-md border border-white/10",
          "transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
          className
        )}
        {...props}
      />
    );
  }
);
GradientCard.displayName = "GradientCard";

export { GradientCard };

