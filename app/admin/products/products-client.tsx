'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Search, Package, Edit, Trash2, Layers, TrendingDown, DollarSign, AlertTriangle, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Input } from '@/components/ui/input'
import { ProductDialog } from '@/components/products/product-dialog'
import { deleteProduct, type Product } from '@/app/actions/products'
import { formatRupiah } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'

interface ProductsClientProps {
  initialProducts: Product[]
  stats: {
    totalProducts: number
    lowStockItems: number
    totalValue: number
  }
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 border border-gray-200',
  discontinued: 'bg-red-50 text-red-700 border border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  discontinued: 'Dihentikan',
}

export function ProductsClient({ initialProducts, stats }: ProductsClientProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)

  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  const categories = Array.from(new Set(products.map(p => p.category_name).filter(Boolean))) as string[]
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.kode_produk.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesCategory = true
    if (categoryFilter !== 'all') {
      matchesCategory = product.category_name === categoryFilter
    }

    let matchesStock = true
    if (stockFilter === 'available') {
      matchesStock = product.stock > product.min_stock
    } else if (stockFilter === 'low') {
      matchesStock = product.stock > 0 && product.stock <= product.min_stock
    } else if (stockFilter === 'empty') {
      matchesStock = product.stock === 0
    }

    return matchesSearch && matchesCategory && matchesStock
  })

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleExportExcel = () => {
    const exportData = filteredProducts.map((p, idx) => ({
      'No': idx + 1,
      'Nama Produk': p.name,
      'Kategori': p.category_name || '-',
      'Kode': p.kode_produk,
      'Harga Beli (Modal)': p.cost || 0,
      'Harga Jual': p.price,
      'Stok Saat Ini': p.stock,
      'Batas Stok Menipis': p.min_stock,
      'Status': STATUS_LABELS[p.status] || p.status
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Produk")
    XLSX.writeFile(wb, `Laporan_Stok_Produk.xlsx`)
  }

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setDialogMode('create')
    setDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const promptDeleteProduct = (product: Product) => {
    if (product.stock > 0) {
      toast.error('Tidak bisa menghapus produk yang masih memiliki stok. Harap kosongkan stok terlebih dahulu.')
      return
    }
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    try {
      const result = await deleteProduct(productToDelete.id)
      if (result.success) {
        toast.success(`Produk "${productToDelete.name}" berhasil dihapus`)
        setProducts(products.filter((p) => p.id !== productToDelete.id))
      } else {
        toast.error('Gagal menghapus produk: ' + result.error)
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus produk')
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produk</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola produk dan inventaris toko Anda</p>
        </div>
        <div className="flex flex-row items-center gap-2 self-start sm:self-auto">
          <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={handleAddProduct} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Produk</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              <p className="text-xs text-gray-400 mt-1">Produk di inventaris</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-14 w-14 translate-x-3 translate-y-3 rounded-full bg-indigo-50 opacity-60" />
        </div>

        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stok Menipis</p>
              <p className={`mt-2 text-2xl font-bold ${stats.lowStockItems > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {stats.lowStockItems}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.lowStockItems === 0 ? 'Semua stok aman' : 'Item perlu diisi'}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-14 w-14 translate-x-3 translate-y-3 rounded-full bg-amber-50 opacity-60" />
        </div>

        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nilai Inventaris</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatRupiah(stats.totalValue)}</p>
              <p className="text-xs text-gray-400 mt-1">Total nilai stok</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-14 w-14 translate-x-3 translate-y-3 rounded-full bg-emerald-50 opacity-60" />
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Daftar Produk</p>
            <p className="text-xs text-gray-400">{filteredProducts.length} produk ditampilkan</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="h-9 text-sm border border-gray-200 rounded-lg focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none px-3 bg-gray-50 text-gray-700 font-medium"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            
            <select
              className="h-9 text-sm border border-gray-200 rounded-lg focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none px-3 bg-gray-50 text-gray-700 font-medium"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">Semua Stok</option>
              <option value="available">Stok Aman</option>
              <option value="low">Stok Menipis</option>
              <option value="empty">Stok Habis (0)</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama atau kode produk..."
                className="pl-9 h-9 w-full sm:w-64 text-sm border-gray-200 focus:border-indigo-300 bg-gray-50 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nama Produk</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Kode</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Harga</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stok</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center text-gray-400">
                      <Package className="h-10 w-10 mb-3 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">
                        {searchTerm ? 'Produk tidak ditemukan' : 'Belum ada produk'}
                      </p>
                      <p className="text-xs mt-1">
                        {searchTerm ? 'Coba kata kunci lain' : 'Mulai tambahkan produk pertama Anda'}
                      </p>
                      {!searchTerm && (
                        <Button size="sm" className="mt-4 gap-1.5" onClick={handleAddProduct}>
                          <Plus className="h-3.5 w-3.5" />
                          Tambah Produk
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{product.category_name || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {product.kode_produk}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{formatRupiah(product.price)}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <span className={`font-semibold ${product.stock <= product.min_stock ? 'text-amber-600' : 'text-gray-900'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[product.status] || STATUS_STYLES.active}`}>
                        {STATUS_LABELS[product.status] || product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => router.push(`/admin/products/${product.id}/batches`)}
                        title="Kelola Batch Stok"
                      >
                        <Layers className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEditProduct(product)}
                          title="Edit Produk"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                          onClick={() => promptDeleteProduct(product)}
                          disabled={product.stock > 0}
                          title={product.stock > 0 ? "Kosongkan stok terlebih dahulu untuk menghapus produk ini" : "Hapus Produk"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 print:hidden">
            <p className="text-sm text-gray-500">
              Menampilkan <span className="font-medium text-gray-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> hingga{' '}
              <span className="font-medium text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> dari{' '}
              <span className="font-medium text-gray-900">{filteredProducts.length}</span> produk
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        mode={dialogMode}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4 scale-110">
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center text-gray-900">
              Hapus Produk
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-gray-500 pt-2">
              Apakah Anda yakin ingin menghapus <strong className="text-gray-900">{productToDelete?.name}</strong> dari sistem? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 sm:space-x-0 mt-6 border-t border-gray-50 pt-5">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 flex-1 h-11">
                Batalkan
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-500/20 flex-1 h-11 border-0"
              >
                Ya, Hapus
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
