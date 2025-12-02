"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  UserPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
  payment_status: string;
  status: string;
  created_at: string;
  rfq_id: string;
  profiles: { company_name: string } | null;
  rfqs: {
    product_name: string;
    quantity: number;
    unit: string;
    delivery_city: string;
    delivery_address: string;
  } | null;
  logistics_jobs: {
    id: string;
    status: string;
    transporter_id: string | null;
    pickup_city: string;
    delivery_city: string;
    agreed_rate: number;
    profiles: { company_name: string } | null;
  }[] | null;
}

interface Transporter {
  id: string;
  company_name: string;
  contact_person: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  accepted: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  payment_verified: { label: "Paid", color: "bg-green-100 text-green-700" },
  in_transit: { label: "In Transit", color: "bg-orange-100 text-orange-700" },
  delivered: { label: "Delivered", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700" },
};

const jobStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Awaiting Transporter", color: "bg-yellow-100 text-yellow-700" },
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700" },
  picked_up: { label: "Picked Up", color: "bg-orange-100 text-orange-700" },
  in_transit: { label: "In Transit", color: "bg-orange-100 text-orange-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);

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

      // Fetch orders
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          total_amount,
          payment_status,
          status,
          created_at,
          rfq_id,
          profiles!orders_buyer_id_fkey (company_name),
          rfqs (
            product_name,
            quantity,
            unit,
            delivery_city,
            delivery_address
          ),
          logistics_jobs (
            id,
            status,
            transporter_id,
            pickup_city,
            delivery_city,
            agreed_rate,
            profiles!logistics_jobs_transporter_id_fkey (company_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && ordersData) {
        setOrders(ordersData);
      }

      // Fetch approved transporters
      const { data: transportersData } = await supabase
        .from("profiles")
        .select("id, company_name, contact_person")
        .eq("role", "transporter")
        .eq("is_approved", true);

      if (transportersData) {
        setTransporters(transportersData);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const updatePaymentStatus = async (orderId: string) => {
    setUpdatingId(orderId);
    const supabase = createClient();

    const { error } = await supabase
      .from("orders")
      .update({ 
        payment_status: "verified",
        payment_verified_at: new Date().toISOString(),
        status: "payment_verified"
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to verify payment");
    } else {
      toast.success("Payment verified!");
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, payment_status: "verified", status: "payment_verified" } : o
      ));
    }
    setUpdatingId(null);
  };

  const createLogisticsJob = async (order: Order) => {
    if (!order.rfqs) return;
    
    setUpdatingId(order.id);
    const supabase = createClient();

    // Get the client offer details including supplier location
    const { data: offerData } = await supabase
      .from("client_offers")
      .select(`
        logistics_fee,
        supplier_quotes (
          supplier_id,
          profiles (
            company_name,
            city,
            address
          )
        )
      `)
      .eq("rfq_id", order.rfq_id)
      .single();

    // Get supplier product location as fallback
    const supplierId = (offerData?.supplier_quotes as { supplier_id?: string })?.supplier_id;
    let supplierCity = (offerData?.supplier_quotes as { profiles?: { city?: string } })?.profiles?.city;
    const supplierAddress = (offerData?.supplier_quotes as { profiles?: { address?: string } })?.profiles?.address;

    // If supplier profile doesn't have city, check their product listing
    if (!supplierCity && supplierId) {
      const { data: productData } = await supabase
        .from("supplier_products")
        .select("location_city, location_province")
        .eq("supplier_id", supplierId)
        .limit(1)
        .single();
      
      if (productData?.location_city) {
        supplierCity = productData.location_city;
      }
    }

    const logisticsFee = offerData?.logistics_fee || 3750;
    const pickupCity = supplierCity || "TBD";
    const pickupAddress = supplierAddress || `Supplier Warehouse, ${pickupCity}`;

    const { data, error } = await supabase
      .from("logistics_jobs")
      .insert({
        order_id: order.id,
        pickup_address: pickupAddress,
        pickup_city: pickupCity,
        delivery_address: order.rfqs.delivery_address || order.rfqs.delivery_city,
        delivery_city: order.rfqs.delivery_city,
        distance_km: null, // Will be calculated with Google Maps later
        agreed_rate: logisticsFee,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create logistics job");
    } else {
      toast.success("Logistics job created!");
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === order.id 
          ? { 
              ...o, 
              logistics_jobs: [{ 
                id: data.id, 
                status: "pending", 
                transporter_id: null,
                pickup_city: pickupCity,
                delivery_city: order.rfqs!.delivery_city,
                agreed_rate: logisticsFee,
                profiles: null 
              }] 
            } 
          : o
      ));
    }
    setUpdatingId(null);
  };

  const assignTransporter = async (jobId: string, transporterId: string) => {
    setAssigningJobId(jobId);
    const supabase = createClient();

    const { error } = await supabase
      .from("logistics_jobs")
      .update({ 
        transporter_id: transporterId,
        status: "assigned"
      })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to assign transporter");
    } else {
      const transporter = transporters.find(t => t.id === transporterId);
      toast.success(`Assigned to ${transporter?.company_name}!`);
      
      // Update local state
      setOrders(prev => prev.map(o => ({
        ...o,
        logistics_jobs: o.logistics_jobs?.map(j => 
          j.id === jobId 
            ? { ...j, transporter_id: transporterId, status: "assigned", profiles: { company_name: transporter?.company_name || "" } }
            : j
        ) || null
      })));
    }
    setAssigningJobId(null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    const supabase = createClient();

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated!");
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
    }
    setUpdatingId(null);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profiles?.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.rfqs?.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
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
          <h1 className="text-2xl font-bold tracking-tight">Manage Orders</h1>
          <p className="text-muted-foreground">
            Track, fulfill, and assign transporters to orders
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter(o => o.status === "accepted").length}
                </p>
                <p className="text-sm text-muted-foreground">Awaiting Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter(o => o.status === "payment_verified").length}
                </p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter(o => o.status === "in_transit").length}
                </p>
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter(o => ["delivered", "completed"].includes(o.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="accepted">Awaiting Payment</SelectItem>
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
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Orders will appear here when buyers accept quotes"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.accepted;
            const hasLogisticsJob = order.logistics_jobs && order.logistics_jobs.length > 0;
            const job = hasLogisticsJob ? order.logistics_jobs![0] : null;
            const jobStatus = job ? jobStatusConfig[job.status] || jobStatusConfig.pending : null;

            return (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="font-mono font-semibold">
                            {order.order_number}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          {order.payment_status === "pending" && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Payment Pending
                            </span>
                          )}
                        </div>
                        
                        <h4 className="font-semibold truncate">{order.rfqs?.product_name}</h4>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          <span>Buyer: {order.profiles?.company_name}</span>
                          <span>•</span>
                          <span>{order.rfqs?.quantity} {order.rfqs?.unit}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {order.rfqs?.delivery_city}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-xl font-bold">
                            R {order.total_amount.toLocaleString("en-ZA")}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          {order.payment_status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => updatePaymentStatus(order.id)}
                              disabled={updatingId === order.id}
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Verify Payment
                                </>
                              )}
                            </Button>
                          )}
                          
                          {order.status === "payment_verified" && !hasLogisticsJob && (
                            <Button
                              size="sm"
                              onClick={() => createLogisticsJob(order)}
                              disabled={updatingId === order.id}
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Truck className="h-4 w-4 mr-1" />
                                  Create Job
                                </>
                              )}
                            </Button>
                          )}

                          {order.status === "delivered" && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, "completed")}
                              disabled={updatingId === order.id}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Logistics Job Section */}
                    {hasLogisticsJob && job && (
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Logistics</span>
                              {jobStatus && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${jobStatus.color}`}>
                                  {jobStatus.label}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span>{job.pickup_city}</span>
                              </div>
                              <span>→</span>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span>{job.delivery_city}</span>
                              </div>
                              <span className="text-muted-foreground">
                                R {job.agreed_rate?.toLocaleString("en-ZA")}
                              </span>
                            </div>

                            {job.transporter_id && job.profiles?.company_name && (
                              <p className="text-sm mt-2">
                                <span className="text-muted-foreground">Transporter: </span>
                                <span className="font-medium">{job.profiles.company_name}</span>
                              </p>
                            )}
                          </div>

                          {/* Assign Transporter */}
                          {!job.transporter_id && (
                            <div className="flex items-center gap-2">
                              <Select
                                onValueChange={(value) => assignTransporter(job.id, value)}
                                disabled={assigningJobId === job.id}
                              >
                                <SelectTrigger className="w-[200px]">
                                  {assigningJobId === job.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      <SelectValue placeholder="Assign Transporter" />
                                    </>
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  {transporters.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                      No transporters available
                                    </SelectItem>
                                  ) : (
                                    transporters.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.company_name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
