"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  CreditCard,
  ArrowRight,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  vat_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  rfqs: {
    reference_number: string;
    product_name: string;
    quantity: number;
    unit: string;
    delivery_city: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  accepted: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  payment_verified: { label: "Paid", color: "bg-green-100 text-green-700", icon: CreditCard },
  in_transit: { label: "In Transit", color: "bg-orange-100 text-orange-700", icon: Truck },
  delivered: { label: "Delivered", color: "bg-purple-100 text-purple-700", icon: Package },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700", icon: CheckCircle2 },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const fetchOrders = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Build query - admins see all, buyers see their own
      let query = supabase
        .from("orders")
        .select(`
          id,
          order_number,
          total_amount,
          vat_amount,
          payment_status,
          status,
          created_at,
          rfqs (
            reference_number,
            product_name,
            quantity,
            unit,
            delivery_city
          )
        `)
        .order("created_at", { ascending: false });

      // Only filter by buyer_id if not admin
      if (profile?.role !== "admin") {
        query = query.eq("buyer_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
      }
      
      if (data) {
        setOrders(data);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.rfqs?.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground">
          Track and manage your orders
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or product..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="accepted">Confirmed</SelectItem>
            <SelectItem value="payment_verified">Paid</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Your accepted quotes will appear here as orders"}
            </p>
            <Button asChild>
              <Link href="/rfqs">
                <FileText className="mr-2 h-4 w-4" />
                View My RFQs
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.accepted;
            const StatusIcon = status.icon;

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-semibold">
                          {order.order_number}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        {order.payment_status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <Clock className="h-3 w-3" />
                            Payment Pending
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg truncate">
                        {order.rfqs?.product_name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        <span>{order.rfqs?.quantity} {order.rfqs?.unit}</span>
                        <span>•</span>
                        <span>Deliver to {order.rfqs?.delivery_city}</span>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold text-primary">
                          R {order.total_amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/orders/${order.id}`}>
                          View
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

