"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  FileText,
  CheckCircle2,
  Truck,
  CreditCard,
  Download,
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

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  vat_amount: number;
  payment_status: string;
  payment_reference: string | null;
  status: string;
  buyer_invoice_url: string | null;
  created_at: string;
  rfqs: {
    id: string;
    reference_number: string;
    product_name: string;
    quantity: number;
    unit: string;
    delivery_address: string;
    delivery_city: string;
    delivery_province: string;
    product_categories: { name: string } | null;
  } | null;
  client_offers: {
    final_total: number;
    estimated_delivery_days: number;
  } | null;
}

interface LogisticsJob {
  id: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  pickup_scheduled_at: string | null;
  delivered_at: string | null;
  pod_url: string | null;
  profiles: { company_name: string } | null;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

const statusSteps = [
  { key: "accepted", label: "Confirmed", icon: CheckCircle2 },
  { key: "payment_verified", label: "Paid", icon: CreditCard },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Package },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [logistics, setLogistics] = useState<LogisticsJob | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch order with related data
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          rfqs (
            id,
            reference_number,
            product_name,
            quantity,
            unit,
            delivery_address,
            delivery_city,
            delivery_province,
            product_categories (name)
          ),
          client_offers (
            final_total,
            estimated_delivery_days
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        toast.error("Order not found");
        router.push("/orders");
        return;
      }

      setOrder(orderData);

      // Fetch logistics job
      const { data: logisticsData } = await supabase
        .from("logistics_jobs")
        .select(`
          *,
          profiles!logistics_jobs_transporter_id_fkey (company_name)
        `)
        .eq("order_id", orderId)
        .single();

      if (logisticsData) {
        setLogistics(logisticsData);
      }

      // Fetch documents
      const { data: docsData } = await supabase
        .from("documents")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (docsData) {
        setDocuments(docsData);
      }

      setLoading(false);
    };

    fetchData();
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {order.order_number}
          </h1>
          <p className="text-muted-foreground">
            {order.rfqs?.product_name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Order Total</p>
          <p className="text-2xl font-bold text-primary">
            R {order.total_amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div className={`flex-1 h-1 ${i <= currentStepIndex ? "bg-primary" : "bg-muted"}`} />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                    >
                      <StepIcon className="h-5 w-5" />
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`flex-1 h-1 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Notice */}
      {order.payment_status === "pending" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">Payment Required</p>
              <p className="text-sm text-amber-700">
                Please complete payment to proceed with your order. Use reference: <strong>{order.order_number}</strong>
              </p>
            </div>
            <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              View Payment Details
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold">{order.rfqs?.product_name}</h4>
              {order.rfqs?.product_categories?.name && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                  {order.rfqs.product_categories.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quantity</span>
                <p className="font-medium">{order.rfqs?.quantity} {order.rfqs?.unit}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Order Date</span>
                <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Est. Delivery</span>
                <p className="font-medium">{order.client_offers?.estimated_delivery_days} days</p>
              </div>
              <div>
                <span className="text-muted-foreground">RFQ Reference</span>
                <p className="font-medium font-mono text-xs">{order.rfqs?.reference_number}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Delivery Address</span>
              </div>
              <p className="text-muted-foreground text-sm ml-6">
                {order.rfqs?.delivery_address}<br />
                {order.rfqs?.delivery_city}, {order.rfqs?.delivery_province}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logistics Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-primary" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logistics ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transporter</span>
                  <span className="font-medium">{logistics.profiles?.company_name || "Assigned"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize font-medium">{logistics.status.replace("_", " ")}</span>
                </div>
                {logistics.pickup_scheduled_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pickup Date</span>
                    <span className="font-medium">
                      {new Date(logistics.pickup_scheduled_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {logistics.delivered_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="font-medium text-green-600">
                      {new Date(logistics.delivered_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {logistics.pod_url && (
                  <Button variant="outline" className="w-full mt-4" asChild>
                    <a href={logistics.pod_url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download Proof of Delivery
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Delivery not yet scheduled</p>
                <p className="text-sm">A transporter will be assigned soon</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document Vault */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Document Vault
          </CardTitle>
          <CardDescription>
            All documents related to this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents yet</p>
              <p className="text-sm">Invoices and receipts will appear here</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {doc.document_type} • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R {(order.total_amount - order.vat_amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (15%)</span>
              <span>R {order.vat_amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>Total</span>
              <span className="text-primary">R {order.total_amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Status</span>
              <span className={order.payment_status === "pending" ? "text-amber-600" : "text-green-600"}>
                {order.payment_status === "pending" ? "Awaiting Payment" : "Paid"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

