import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-white/5',
        className
      )}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/60 p-5 backdrop-blur-md">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-32" />
    </div>
  )
}

export function ProjectListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-white/8 bg-white/2 p-4">
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
