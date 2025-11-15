'use server'

import { createClient } from '@/lib/supabase/server'

export type Category = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export async function getCategories(): Promise<{ categories: Category[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return { categories: [], error: error.message }
  }
  return { categories: data as Category[], error: null }
}

export async function getCategory(id: string): Promise<{ category: Category | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { category: null, error: error.message }
  }
  return { category: data as Category, error: null }
}

export async function createCategory(formData: FormData): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .insert([{
      name: formData.get('name') as string,
      description: formData.get('description') as string || null
    }])

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, error: null }
}

export async function updateCategory(id: string, formData: FormData): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, error: null }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, error: null }
}
