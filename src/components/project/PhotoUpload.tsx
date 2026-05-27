'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Upload, X, ImageIcon, Trash2 } from 'lucide-react'
import { uploadProjectImage, deleteProjectImage } from '@/services/imageService'
import { ImageGallerySkeleton } from '@/components/ui/LoadingSkeleton'
import type { ProjectImage } from '@/types'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

interface PhotoUploadProps {
  projectId: string
  userId: string
  images: ProjectImage[]
  onImagesChange: (images: ProjectImage[]) => void
  canEdit: boolean
  loading?: boolean
}

export default function PhotoUpload({
  projectId,
  userId,
  images,
  onImagesChange,
  canEdit,
  loading = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<ProjectImage | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!canEdit) return
      setUploading(true)
      try {
        const uploads = await Promise.all(
          acceptedFiles.map(file => uploadProjectImage(projectId, userId, file))
        )
        onImagesChange([...images, ...uploads])
        toast.success(`${uploads.length} photo${uploads.length > 1 ? 's' : ''} uploaded`)
      } catch {
        toast.error('Failed to upload photos')
      } finally {
        setUploading(false)
      }
    },
    [canEdit, projectId, userId, images, onImagesChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    disabled: !canEdit || uploading,
    multiple: true,
  })

  const handleDelete = async (image: ProjectImage) => {
    try {
      await deleteProjectImage(image)
      onImagesChange(images.filter(i => i.id !== image.id))
      toast.success('Photo removed')
    } catch {
      toast.error('Failed to remove photo')
    }
  }

  if (loading) return <ImageGallerySkeleton />

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {canEdit && (
        <div
          {...getRootProps()}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200',
            isDragActive
              ? 'border-green-500/60 bg-green-500/5'
              : 'border-white/10 hover:border-white/20 hover:bg-white/2',
            (uploading) && 'pointer-events-none opacity-50'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
            ) : (
              <Upload className={cn('h-8 w-8', isDragActive ? 'text-green-400' : 'text-white/20')} />
            )}
            <p className={cn('text-sm', isDragActive ? 'text-green-400' : 'text-white/40')}>
              {uploading
                ? 'Uploading…'
                : isDragActive
                ? 'Drop photos here'
                : 'Drag & drop photos, or click to browse'}
            </p>
            <p className="text-xs text-white/20">JPG, PNG, WebP, GIF • Multiple files allowed</p>
          </div>
        </div>
      )}

      {/* Gallery */}
      {images.length === 0 && !canEdit && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <ImageIcon className="h-10 w-10 text-white/10" />
          <p className="text-sm text-white/30">No photos yet</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map(image => (
            <div
              key={image.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-white/8 bg-white/3 transition-all hover:border-white/15"
              onClick={() => setLightbox(image)}
            >
              <Image
                src={image.url}
                alt={image.caption ?? 'Restoration photo'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {canEdit && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(image) }}
                  className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/80"
                >
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                </button>
              )}
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white/70 line-clamp-1">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-h-[85vh] max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <Image
              src={lightbox.url}
              alt={lightbox.caption ?? ''}
              width={1200}
              height={800}
              className="rounded-xl object-contain max-h-[85vh] w-full"
            />
            {lightbox.caption && (
              <p className="mt-3 text-center text-sm text-white/50">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
