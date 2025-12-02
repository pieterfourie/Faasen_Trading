"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  MapPin,
  Clock,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  ShoppingCart,
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

interface SupplierProduct {
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
  profiles: {
    id: string;
    company_name: string;
    contact_person: string | null;
    email: string;
    phone: string | null;
    city: string | null;
  } | null;
  product_categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        toast.error("Access denied");
        router.push("/dashboard");
        return;
      }

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("id, name")
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch all active products with supplier info
      const { data, error } = await supabase
        .from("supplier_products")
        .select(`
          *,
          profiles!supplier_products_supplier_id_fkey (
            id,
            company_name,
            contact_person,
            email,
            phone,
            city
          ),
          product_categories (name)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const uniqueLocations = [...new Set(products.map(p => p.location_province).filter(Boolean))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.profiles?.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.product_categories?.name === categoryFilter;
    const matchesLocation = locationFilter === "all" || product.location_province === locationFilter;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Group by category for overview
  const productsByCategory = products.reduce((acc, product) => {
    const cat = product.product_categories?.name || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Catalog</h1>
          <p className="text-muted-foreground">
            Browse {products.length} products from verified suppliers
          </p>
        </div>
      </div>

      {/* Category Overview */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(productsByCategory).map(([category, count]) => (
          <button
            key={category}
            onClick={() => setCategoryFilter(categoryFilter === category ? "all" : category)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === category
                ? "bg-primary text-white"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {category} ({count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or suppliers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <MapPin className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {uniqueLocations.map((loc) => (
              <SelectItem key={loc} value={loc!}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid + Detail Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products List */}
        <div className={`space-y-4 ${selectedProduct ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground text-center">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 ${selectedProduct ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    selectedProduct?.id === product.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {product.product_categories?.name && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {product.product_categories.name}
                          </span>
                        )}
                        <CardTitle className="text-base mt-2 truncate">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground truncate">
                          {product.profiles?.company_name}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-primary">
                        R {product.price_per_unit.toLocaleString("en-ZA")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {product.unit}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {product.location_city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {product.location_city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {product.lead_time_days}d
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedProduct && (
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    {selectedProduct.product_categories?.name && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {selectedProduct.product_categories.name}
                      </span>
                    )}
                    <CardTitle className="mt-2">{selectedProduct.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProduct(null)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.description}
                  </p>
                )}

                {/* Pricing */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-3xl font-bold text-primary">
                      R {selectedProduct.price_per_unit.toLocaleString("en-ZA")}
                    </span>
                    <span className="text-muted-foreground">/ {selectedProduct.unit}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Min. order: {selectedProduct.minimum_order_quantity} {selectedProduct.unit}
                  </div>
                  {selectedProduct.stock_available !== null && (
                    <div className="text-sm text-muted-foreground">
                      Stock: {selectedProduct.stock_available} {selectedProduct.unit}
                    </div>
                  )}
                </div>

                {/* Delivery Info */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delivery
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    <p>Lead time: {selectedProduct.lead_time_days} days</p>
                    {selectedProduct.location_city && (
                      <p>Ships from: {selectedProduct.location_city}, {selectedProduct.location_province}</p>
                    )}
                  </div>
                </div>

                {/* Supplier Info */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Supplier
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">{selectedProduct.profiles?.company_name}</p>
                    {selectedProduct.profiles?.contact_person && (
                      <p className="text-muted-foreground">
                        {selectedProduct.profiles.contact_person}
                      </p>
                    )}
                    {selectedProduct.profiles?.email && (
                      <a
                        href={`mailto:${selectedProduct.profiles.email}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {selectedProduct.profiles.email}
                      </a>
                    )}
                    {selectedProduct.profiles?.phone && (
                      <a
                        href={`tel:${selectedProduct.profiles.phone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {selectedProduct.profiles.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4">
                  <Button className="w-full" asChild>
                    <Link href={`/admin/rfqs?product=${encodeURIComponent(selectedProduct.name)}&supplier=${selectedProduct.profiles?.id}`}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create Deal
                    </Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Match this product with a buyer RFQ
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

