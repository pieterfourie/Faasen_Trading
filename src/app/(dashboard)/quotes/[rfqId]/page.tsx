"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Clock,
  FileText,
  CheckCircle2,
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
import { createClient } from "@/lib/supabase/client";

const quoteSchema = z.object({
  price_per_unit: z.coerce.number().positive("Price must be greater than 0"),
  lead_time_days: z.coerce.number().int().min(1, "Lead time is required"),
  valid_until: z.string().min(1, "Validity date is required"),
  notes: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface RFQ {
  id: string;
  reference_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  delivery_address: string;
  delivery_city: string;
  delivery_province: string;
  required_by: string | null;
  additional_notes: string | null;
  created_at: string;
  product_categories?: { name: string } | null;
}

interface ExistingQuote {
  id: string;
  price_per_unit: number;
  total_price: number;
  lead_time_days: number;
  valid_until: string;
  notes: string | null;
  is_selected: boolean;
  created_at: string;
}

export default function SubmitQuotePage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.rfqId as string;
  
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [existingQuote, setExistingQuote] = useState<ExistingQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuoteFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(quoteSchema) as any,
    defaultValues: {
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  });

  const pricePerUnit = watch("price_per_unit");
  const totalPrice = rfq ? (pricePerUnit || 0) * rfq.quantity : 0;

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch RFQ details
      const { data: rfqData, error: rfqError } = await supabase
        .from("rfqs")
        .select(`
          id,
          reference_number,
          product_name,
          quantity,
          unit,
          delivery_address,
          delivery_city,
          delivery_province,
          required_by,
          additional_notes,
          created_at,
          product_categories (name)
        `)
        .eq("id", rfqId)
        .single();

      if (rfqError || !rfqData) {
        toast.error("RFQ not found");
        router.push("/quotes");
        return;
      }

      setRfq(rfqData as unknown as RFQ);

      // Check for existing quote
      const { data: quoteData } = await supabase
        .from("supplier_quotes")
        .select("*")
        .eq("rfq_id", rfqId)
        .eq("supplier_id", user.id)
        .single();

      if (quoteData) {
        setExistingQuote(quoteData);
      }

      setPageLoading(false);
    };

    fetchData();
  }, [rfqId, router]);

  const onSubmit = async (data: QuoteFormData) => {
    if (!rfq) return;
    
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit a quote");
        return;
      }

      const quoteData = {
        rfq_id: rfqId,
        supplier_id: user.id,
        price_per_unit: data.price_per_unit,
        total_price: data.price_per_unit * rfq.quantity,
        lead_time_days: data.lead_time_days,
        valid_until: data.valid_until,
        notes: data.notes || null,
      };

      if (existingQuote) {
        // Update existing quote
        const { error } = await supabase
          .from("supplier_quotes")
          .update(quoteData)
          .eq("id", existingQuote.id);

        if (error) throw error;
        toast.success("Quote updated successfully!");
      } else {
        // Insert new quote
        const { error } = await supabase
          .from("supplier_quotes")
          .insert(quoteData);

        if (error) throw error;
        toast.success("Quote submitted successfully!");
      }

      router.push("/quotes");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to submit quote. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!rfq) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quotes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {existingQuote ? "Update Quote" : "Submit Quote"}
          </h1>
          <p className="text-muted-foreground">
            {rfq.reference_number}
          </p>
        </div>
      </div>

      {/* Quote Selected Notice */}
      {existingQuote?.is_selected && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-4 py-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Your quote was selected!</p>
              <p className="text-sm text-green-700">
                The buyer has accepted your quote. You will receive order details shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RFQ Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{rfq.product_name}</h3>
            {rfq.product_categories?.name && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                {rfq.product_categories.name}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span><strong>{rfq.quantity}</strong> {rfq.unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{rfq.delivery_city}, {rfq.delivery_province}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Posted {new Date(rfq.created_at).toLocaleDateString()}</span>
            </div>
            {rfq.required_by && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due by {new Date(rfq.required_by).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="text-sm">
            <strong>Delivery Address:</strong>
            <p className="text-muted-foreground">
              {rfq.delivery_address}, {rfq.delivery_city}, {rfq.delivery_province}
            </p>
          </div>

          {rfq.additional_notes && (
            <div className="text-sm">
              <strong>Additional Notes:</strong>
              <p className="text-muted-foreground">{rfq.additional_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Quote</CardTitle>
            <CardDescription>
              Provide your best price and delivery terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_per_unit">Price per {rfq.unit} (ZAR) *</Label>
                <Input
                  id="price_per_unit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={existingQuote?.price_per_unit}
                  {...register("price_per_unit")}
                  disabled={isLoading || existingQuote?.is_selected}
                />
                {errors.price_per_unit && (
                  <p className="text-sm text-destructive">{errors.price_per_unit.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Total Price (ZAR)</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted font-semibold">
                  R {totalPrice.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead_time_days">Lead Time (days) *</Label>
                <Input
                  id="lead_time_days"
                  type="number"
                  min="1"
                  placeholder="7"
                  defaultValue={existingQuote?.lead_time_days}
                  {...register("lead_time_days")}
                  disabled={isLoading || existingQuote?.is_selected}
                />
                {errors.lead_time_days && (
                  <p className="text-sm text-destructive">{errors.lead_time_days.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Quote Valid Until *</Label>
                <Input
                  id="valid_until"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  defaultValue={existingQuote?.valid_until?.split("T")[0]}
                  {...register("valid_until")}
                  disabled={isLoading || existingQuote?.is_selected}
                />
                {errors.valid_until && (
                  <p className="text-sm text-destructive">{errors.valid_until.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Delivery terms, payment requirements, etc."
                defaultValue={existingQuote?.notes || ""}
                {...register("notes")}
                disabled={isLoading || existingQuote?.is_selected}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        {!existingQuote?.is_selected && (
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
              ) : existingQuote ? (
                "Update Quote"
              ) : (
                "Submit Quote"
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

