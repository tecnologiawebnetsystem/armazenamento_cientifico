import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("sigac-skeleton rounded-md", className)}
      {...props}
    />
  )
}

function SigacSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={className} {...props} />
}

export { Skeleton, SigacSkeleton }
