import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[#5f8f49]/10',
        className
      )}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-3xl border border-[#5c6f55]/13 bg-[#fffaf1]/72 p-5 shadow-[0_14px_36px_rgba(68,79,58,0.1)] backdrop-blur-md">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-32" />
    </div>
  )
}

export function ProjectListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-[#5c6f55]/13 bg-white/50 p-4">
          <Skeleton className="mb-2 h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function ImageGallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  )
}
