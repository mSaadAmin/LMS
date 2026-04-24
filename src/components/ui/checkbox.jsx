import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      ref={ref}
      role="checkbox"
      aria-checked={checked}
      type="button"
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        checked && "bg-primary border-primary text-primary-foreground",
        className
      )}
      {...props}
    >
      {checked && (
        <span className="flex items-center justify-center text-current">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
