"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Package,
  Edit,
  Trash2,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_per_unit: number;
  unit: string;
  minimum_order_quantity: number;
  stock_available: number | null;
  lead_time_days: number;
  location_city: string | null;
  location_province: string | null;
  is_active: boolean;
  created_at: string;
  product_categories: { name: string } | null;
}

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("supplier_products")
      .select(`
        *,
        product_categories (name)
      `)
      .eq("supplier_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("supplier_products")
      .update({ is_active: !currentStatus })
      .eq("id", productId);

    if (error) {
      toast.error("Failed to update product status");
    } else {
      toast.success(currentStatus ? "Product deactivated" : "Product activated");
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_active: !currentStatus } : p
      ));
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    setDeletingId(productId);
    const supabase = createClient();
    
    const { error } = await supabase
      .from("supplier_products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
    setDeletingId(null);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && product.is_active) ||
      (statusFilter === "inactive" && !product.is_active);
    return matchesSearch && matchesStatus;
  });

  const activeCount = products.filter(p => p.is_active).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Products</h1>
          <p className="text-muted-foreground">
            {activeCount} active product{activeCount !== 1 ? "s" : ""} listed
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "List your first product to start receiving orders"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button asChild>
                <Link href="/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card 
              key={product.id} 
              className={`hover:shadow-md transition-shadow ${!product.is_active ? "opacity-60" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {product.product_categories?.name && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {product.product_categories.name}
                        </span>
                      )}
                      {product.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-semibold">
                      R {product.price_per_unit.toLocaleString("en-ZA")} / {product.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Min. Order</span>
                    <span>{product.minimum_order_quantity} {product.unit}</span>
                  </div>
                  {product.stock_available !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock</span>
                      <span>{product.stock_available} {product.unit}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  {product.location_city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {product.location_city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {product.lead_time_days} days lead time
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/products/${product.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleProductStatus(product.id, product.is_active)}
                  >
                    {product.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                    disabled={deletingId === product.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

