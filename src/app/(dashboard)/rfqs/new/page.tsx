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
  MapPin,
  Calendar,
  FileText,
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

const rfqSchema = z.object({
  product_name: z.string().min(3, "Product name is required"),
  product_category_id: z.string().min(1, "Please select a category"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  delivery_address: z.string().min(5, "Delivery address is required"),
  delivery_city: z.string().min(2, "City is required"),
  delivery_province: z.string().min(2, "Province is required"),
  delivery_postal_code: z.string().optional(),
  required_by: z.string().optional(),
  additional_notes: z.string().optional(),
});

type RFQFormData = z.infer<typeof rfqSchema>;

interface Category {
  id: string;
  name: string;
}

const units = ["tons", "kg", "units", "meters", "liters", "bags", "pallets"];

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

export default function NewRFQPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RFQFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(rfqSchema) as any,
    defaultValues: {
      unit: "tons",
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

  const onSubmit = async (data: RFQFormData) => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create an RFQ");
        return;
      }

      const { error } = await supabase.from("rfqs").insert({
        buyer_id: user.id,
        product_name: data.product_name,
        product_category_id: data.product_category_id,
        quantity: data.quantity,
        unit: data.unit,
        delivery_address: data.delivery_address,
        delivery_city: data.delivery_city,
        delivery_province: data.delivery_province,
        delivery_postal_code: data.delivery_postal_code || null,
        required_by: data.required_by || null,
        additional_notes: data.additional_notes || null,
        status: "new",
      });

      if (error) {
        console.error("RFQ creation error:", error);
        toast.error("Failed to create RFQ. Please try again.");
        return;
      }

      toast.success("RFQ submitted successfully! Suppliers will be notified.");
      router.push("/rfqs");
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
          <Link href="/rfqs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New RFQ</h1>
          <p className="text-muted-foreground">
            Request quotes from verified suppliers
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
              Describe what you need to purchase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product_category_id">Category *</Label>
              <Select
                onValueChange={(value) => setValue("product_category_id", value)}
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
              {errors.product_category_id && (
                <p className="text-sm text-destructive">{errors.product_category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                placeholder="e.g., Portland Cement 42.5N"
                {...register("product_name")}
                disabled={isLoading}
              />
              {errors.product_name && (
                <p className="text-sm text-destructive">{errors.product_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register("quantity")}
                  disabled={isLoading}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity.message}</p>
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
          </CardContent>
        </Card>

        {/* Delivery Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Delivery Location
            </CardTitle>
            <CardDescription>
              Where should the goods be delivered?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_address">Street Address *</Label>
              <Input
                id="delivery_address"
                placeholder="123 Main Road"
                {...register("delivery_address")}
                disabled={isLoading}
              />
              {errors.delivery_address && (
                <p className="text-sm text-destructive">{errors.delivery_address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_city">City *</Label>
                <Input
                  id="delivery_city"
                  placeholder="Cape Town"
                  {...register("delivery_city")}
                  disabled={isLoading}
                />
                {errors.delivery_city && (
                  <p className="text-sm text-destructive">{errors.delivery_city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_province">Province *</Label>
                <Select
                  onValueChange={(value) => setValue("delivery_province", value)}
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
                {errors.delivery_province && (
                  <p className="text-sm text-destructive">{errors.delivery_province.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_postal_code">Postal Code</Label>
              <Input
                id="delivery_postal_code"
                placeholder="8001"
                {...register("delivery_postal_code")}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="required_by" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Required By Date
              </Label>
              <Input
                id="required_by"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                {...register("required_by")}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_notes">Additional Notes</Label>
              <textarea
                id="additional_notes"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any special requirements, specifications, or delivery instructions..."
                {...register("additional_notes")}
                disabled={isLoading}
              />
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
                Submitting...
              </>
            ) : (
              "Submit RFQ"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

