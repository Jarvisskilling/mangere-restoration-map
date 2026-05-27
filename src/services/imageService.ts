import { createClient } from '@/lib/supabase/client'
import type { ProjectImage } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const BUCKET = 'project-images'

export async function uploadProjectImage(
  projectId: string,
  userId: string,
  file: File
): Promise<ProjectImage> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const storagePath = `${userId}/${projectId}/${uuidv4()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  const { data, error } = await supabase
    .from('project_images')
    .insert({
      project_id: projectId,
      storage_path: storagePath,
      url: urlData.publicUrl,
      uploaded_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchProjectImages(projectId: string): Promise<ProjectImage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_images')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function deleteProjectImage(image: ProjectImage): Promise<void> {
  const supabase = createClient()

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path])

  if (storageError) throw storageError

  const { error } = await supabase.from('project_images').delete().eq('id', image.id)
  if (error) throw error
}

export async function updateImageCaption(id: string, caption: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_images')
    .update({ caption })
    .eq('id', id)
  if (error) throw error
}
