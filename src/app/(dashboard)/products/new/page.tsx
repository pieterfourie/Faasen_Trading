"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  Package,
  DollarSign,
  MapPin,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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

const productSchema = z.object({
  name: z.string().min(3, "Product name is required"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Please select a category"),
  price_per_unit: z.coerce.number().positive("Price must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  minimum_order_quantity: z.coerce.number().positive("Minimum order must be at least 1"),
  stock_available: z.coerce.number().optional(),
  lead_time_days: z.coerce.number().int().min(1, "Lead time is required"),
  location_city: z.string().optional(),
  location_province: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
}

const units = ["tons", "kg", "units", "meters", "liters", "bags", "pallets", "cubic meters"];

const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      unit: "tons",
      minimum_order_quantity: 1,
      lead_time_days: 7,
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("product_categories")
        .select("id, name")
        .order("name");
      
      if (data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      const { error } = await supabase.from("supplier_products").insert({
        supplier_id: user.id,
        name: data.name,
        description: data.description || null,
        category_id: data.category_id,
        price_per_unit: data.price_per_unit,
        unit: data.unit,
        minimum_order_quantity: data.minimum_order_quantity,
        stock_available: data.stock_available || null,
        lead_time_days: data.lead_time_days,
        location_city: data.location_city || null,
        location_province: data.location_province || null,
        is_active: true,
      });

      if (error) {
        console.error("Error:", error);
        toast.error("Failed to add product. Please try again.");
        return;
      }

      toast.success("Product added successfully!");
      router.push("/products");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
          <p className="text-muted-foreground">
            List a new product for admin to see
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              Product Details
            </CardTitle>
            <CardDescription>
              Basic information about your product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select
                onValueChange={(value) => setValue("category_id", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Portland Cement 42.5N, NPK Fertilizer 2:3:2"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Product specifications, quality grades, certifications..."
                {...register("description")}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Pricing & Quantity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_per_unit">Price per Unit (ZAR) *</Label>
                <Input
                  id="price_per_unit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("price_per_unit")}
                  disabled={isLoading}
                />
                {errors.price_per_unit && (
                  <p className="text-sm text-destructive">{errors.price_per_unit.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  defaultValue="tons"
                  onValueChange={(value) => setValue("unit", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum_order_quantity">Minimum Order *</Label>
                <Input
                  id="minimum_order_quantity"
                  type="number"
                  step="0.01"
                  placeholder="1"
                  {...register("minimum_order_quantity")}
                  disabled={isLoading}
                />
                {errors.minimum_order_quantity && (
                  <p className="text-sm text-destructive">{errors.minimum_order_quantity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_available">Stock Available (optional)</Label>
                <Input
                  id="stock_available"
                  type="number"
                  step="0.01"
                  placeholder="Leave empty for unlimited"
                  {...register("stock_available")}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Lead Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Location & Delivery
            </CardTitle>
            <CardDescription>
              Where the product ships from and delivery time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_city">City</Label>
                <Input
                  id="location_city"
                  placeholder="e.g., Johannesburg"
                  {...register("location_city")}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_province">Province</Label>
                <Select
                  onValueChange={(value) => setValue("location_province", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_time_days" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Lead Time (days) *
              </Label>
              <Input
                id="lead_time_days"
                type="number"
                min="1"
                placeholder="7"
                {...register("lead_time_days")}
                disabled={isLoading}
              />
              {errors.lead_time_days && (
                <p className="text-sm text-destructive">{errors.lead_time_days.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                How many days from order confirmation to ready for pickup
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Product"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

