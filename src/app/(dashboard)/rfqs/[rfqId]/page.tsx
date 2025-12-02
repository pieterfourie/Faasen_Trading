"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

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
  status: string;
  created_at: string;
  product_categories?: { name: string } | null;
}

interface ClientOffer {
  id: string;
  vat_percent: number;
  final_total: number;
  estimated_delivery_days: number;
  valid_until: string;
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; description: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700", description: "Your request has been submitted and is being reviewed." },
  sourcing: { label: "Sourcing", color: "bg-yellow-100 text-yellow-700", description: "We're gathering quotes from our verified suppliers." },
  quoted: { label: "Quoted", color: "bg-purple-100 text-purple-700", description: "A quote is ready for your review!" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700", description: "You've accepted the quote. We're processing your order." },
  payment_verified: { label: "Payment Verified", color: "bg-green-100 text-green-700", description: "Payment received. Preparing for delivery." },
  in_transit: { label: "In Transit", color: "bg-blue-100 text-blue-700", description: "Your order is on its way!" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", description: "Order has been delivered." },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700", description: "Order completed successfully." },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", description: "This request has been cancelled." },
};

export default function RFQDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.rfqId as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [offer, setOffer] = useState<ClientOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch RFQ
      const { data: rfqData, error: rfqError } = await supabase
        .from("rfqs")
        .select(`
          *,
          product_categories (name)
        `)
        .eq("id", rfqId)
        .single();

      if (rfqError || !rfqData) {
        toast.error("RFQ not found");
        router.push("/rfqs");
        return;
      }

      setRfq(rfqData);

      // Fetch client offer if exists (only buyer-safe fields)
      const { data: offerData } = await supabase
        .from("client_offers")
        .select("id, vat_percent, final_total, estimated_delivery_days, valid_until, status")
        .eq("rfq_id", rfqId)
        .single();

      if (offerData) {
        setOffer(offerData);
      }

      setLoading(false);
    };

    fetchData();
  }, [rfqId, router]);

  const handleAcceptOffer = async () => {
    if (!offer || !rfq) return;

    setAccepting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // Update offer status
      const { error: offerError } = await supabase
        .from("client_offers")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      // Update RFQ status
      const { error: rfqError } = await supabase
        .from("rfqs")
        .update({ status: "accepted" })
        .eq("id", rfqId);

      if (rfqError) throw rfqError;

      // Create order
      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          client_offer_id: offer.id,
          rfq_id: rfqId,
          buyer_id: user.id,
          total_amount: offer.final_total,
          vat_amount: offer.vat_amount,
          status: "accepted",
        });

      if (orderError) throw orderError;

      toast.success("Quote accepted! Your order has been created.");
      setOffer({ ...offer, status: "accepted" });
      setRfq({ ...rfq, status: "accepted" });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to accept quote. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!rfq) return null;

  const status = statusConfig[rfq.status] || statusConfig.new;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rfqs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {rfq.reference_number}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-muted-foreground">{status.description}</p>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            {["new", "sourcing", "quoted", "accepted", "completed"].map((step, i) => {
              const stepIndex = ["new", "sourcing", "quoted", "accepted", "completed"].indexOf(rfq.status);
              const isCompleted = i <= stepIndex;
              const isCurrent = i === stepIndex;

              return (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm">{i + 1}</span>
                    )}
                  </div>
                  <span className="text-xs mt-2 capitalize">{step}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Client Offer */}
      {offer && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Your Quote
            </CardTitle>
            <CardDescription>
              Valid until {new Date(offer.valid_until).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price - Clean view for buyer (no margin/cost breakdown) */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Your Quoted Price</p>
                <p className="text-4xl font-bold text-primary">
                  R {offer.final_total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Price includes delivery & VAT ({offer.vat_percent}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Estimated delivery: {offer.estimated_delivery_days} business days after payment
            </div>

            {/* Accept Button */}
            {offer.status === "pending" && (
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/rfqs")}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAcceptOffer}
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Accept Quote
                    </>
                  )}
                </Button>
              </div>
            )}

            {offer.status === "accepted" && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Quote accepted! Check your orders for next steps.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Waiting for Quote */}
      {!offer && rfq.status !== "cancelled" && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Quote in Progress</h3>
            <p className="text-muted-foreground text-center max-w-md">
              We&apos;re gathering quotes from our verified suppliers. 
              You&apos;ll receive a notification when your quote is ready.
            </p>
          </CardContent>
        </Card>
      )}

      {/* RFQ Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
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
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Submitted {new Date(rfq.created_at).toLocaleDateString()}</span>
            </div>
            {rfq.required_by && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Required by {new Date(rfq.required_by).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Delivery Address</span>
            </div>
            <p className="text-muted-foreground ml-6">
              {rfq.delivery_address}, {rfq.delivery_city}, {rfq.delivery_province}
            </p>
          </div>

          {rfq.additional_notes && (
            <div>
              <span className="font-medium">Additional Notes</span>
              <p className="text-muted-foreground mt-1">{rfq.additional_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

