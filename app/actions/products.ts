'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Product = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  category_name?: string
  sku: string
  price: number
  cost: number | null
  stock: number
  min_stock: number
  unit: string
  status: 'active' | 'inactive' | 'discontinued'
  created_at: string
  updated_at: string
}

export type ProductWithCategory = Product & {
  categories: {
    id: string
    name: string
  } | null
}

export async function getProducts() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (id, name)
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching products:', error)
    return { products: [], error: error.message }
  }
  
  // Transform the data to match the Product type
  const products = data.map(product => ({
    ...product,
    category_id: product.category_id,
    category_name: product.categories?.name || null
  }))
  
  return { products, error: null }
}

export async function getCategoriesForSelect() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return { categories: [], error: error.message }
  }
  
  return { categories: data, error: null }
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient()
  
  const product = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    category: formData.get('category') as string,
    sku: formData.get('sku') as string,
    price: parseFloat(formData.get('price') as string),
    cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : null,
    stock: parseInt(formData.get('stock') as string),
    min_stock: parseInt(formData.get('min_stock') as string),
    unit: formData.get('unit') as string || 'unit',
    status: formData.get('status') as 'active' | 'inactive' | 'discontinued',
  }
  
  const { error } = await supabase
    .from('products')
    .insert([product])
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/admin/products')
  return { success: true, error: null }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const product = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    category: formData.get('category') as string,
    sku: formData.get('sku') as string,
    price: parseFloat(formData.get('price') as string),
    cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : null,
    stock: parseInt(formData.get('stock') as string),
    min_stock: parseInt(formData.get('min_stock') as string),
    unit: formData.get('unit') as string || 'unit',
    status: formData.get('status') as 'active' | 'inactive' | 'discontinued',
  }
  
  const { error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/admin/products')
  return { success: true, error: null }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/admin/products')
  return { success: true, error: null }
}
