"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Truck,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  Upload,
  Camera,
  ArrowRight,
  Navigation,
  Calendar,
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

interface LogisticsJob {
  id: string;
  pickup_address: string;
  pickup_city: string;
  delivery_address: string;
  delivery_city: string;
  distance_km: number | null;
  agreed_rate: number | null;
  status: string;
  pickup_scheduled_at: string | null;
  delivered_at: string | null;
  pod_url: string | null;
  created_at: string;
  orders: {
    order_number: string;
    rfqs: {
      product_name: string;
      quantity: number;
      unit: string;
      additional_notes: string | null;
      product_categories: {
        name: string;
      } | null;
    } | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700", icon: Clock },
  pickup_scheduled: { label: "Pickup Scheduled", color: "bg-yellow-100 text-yellow-700", icon: Calendar },
  in_transit: { label: "In Transit", color: "bg-orange-100 text-orange-700", icon: Truck },
  delivered: { label: "Delivered", color: "bg-purple-100 text-purple-700", icon: Package },
  pod_uploaded: { label: "POD Uploaded", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700", icon: CheckCircle2 },
};

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<LogisticsJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Build query - admins see all assigned jobs, transporters see their own
      let query = supabase
        .from("logistics_jobs")
        .select(`
          id,
          pickup_address,
          pickup_city,
          delivery_address,
          delivery_city,
          distance_km,
          agreed_rate,
          status,
          pickup_scheduled_at,
          delivered_at,
          pod_url,
          created_at,
          orders (
            order_number,
            rfqs (
              product_name,
              quantity,
              unit,
              additional_notes,
              product_categories (
                name
              )
            )
          )
        `)
        .order("created_at", { ascending: false });

      // Only filter by transporter_id if not admin
      if (profile?.role !== "admin") {
        query = query.eq("transporter_id", user.id);
      } else {
        // Admin sees all jobs that have been assigned (not pending unassigned ones)
        query = query.not("transporter_id", "is", null);
      }

      const { data, error } = await query;

      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    };

    fetchJobs();
  }, []);

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const supabase = createClient();
    
    const updateData: Record<string, unknown> = { status: newStatus };
    
    if (newStatus === "in_transit") {
      updateData.pickup_scheduled_at = new Date().toISOString();
    } else if (newStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    // Update logistics job
    const { error } = await supabase
      .from("logistics_jobs")
      .update(updateData)
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    // Also sync the order status so buyer can see it
    // Find the order for this job and update its status
    const job = jobs.find(j => j.id === jobId);
    if (job?.orders) {
      // Map logistics status to order status
      const orderStatusMap: Record<string, string> = {
        "in_transit": "in_transit",
        "delivered": "delivered",
      };
      
      const newOrderStatus = orderStatusMap[newStatus];
      if (newOrderStatus) {
        // Get order ID from the job
        const { data: jobData } = await supabase
          .from("logistics_jobs")
          .select("order_id")
          .eq("id", jobId)
          .single();

        if (jobData?.order_id) {
          await supabase
            .from("orders")
            .update({ status: newOrderStatus })
            .eq("id", jobData.order_id);
        }
      }
    }

    toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`);
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: newStatus, ...updateData } : j
    ));
  };

  const handlePODUpload = async (jobId: string, file: File) => {
    setUploadingJobId(jobId);
    const supabase = createClient();

    try {
      // Upload file to Supabase Storage
      const fileName = `pod_${jobId}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) {
        // If bucket doesn't exist, show helpful message
        if (uploadError.message.includes("bucket")) {
          toast.error("Storage not configured. Please set up the 'documents' bucket in Supabase.");
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // Update job with POD URL
      const { error: updateError } = await supabase
        .from("logistics_jobs")
        .update({ 
          pod_url: publicUrl,
          status: "pod_uploaded",
          pod_uploaded_at: new Date().toISOString()
        })
        .eq("id", jobId);

      if (updateError) throw updateError;

      toast.success("Proof of Delivery uploaded successfully!");
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, pod_url: publicUrl, status: "pod_uploaded" } : j
      ));
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload POD. Please try again.");
    } finally {
      setUploadingJobId(null);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.orders?.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.orders?.rfqs?.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeJobs = jobs.filter(j => !["completed", "pod_uploaded"].includes(j.status));
  const completedJobs = jobs.filter(j => ["completed", "pod_uploaded"].includes(j.status));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Jobs</h1>
          <p className="text-muted-foreground">
            {activeJobs.length} active, {completedJobs.length} completed
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs">
            <Truck className="mr-2 h-4 w-4" />
            Find Jobs
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
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
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="pod_uploaded">POD Uploaded</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hidden file input for POD upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingJobId) {
            handlePODUpload(uploadingJobId, file);
          }
        }}
      />

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Accept jobs from the available jobs page"}
            </p>
            <Button asChild>
              <Link href="/jobs">Browse Available Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const status = statusConfig[job.status] || statusConfig.assigned;
            const StatusIcon = status.icon;

            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm text-muted-foreground">
                            {job.orders?.order_number}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">
                          {job.orders?.rfqs?.product_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{job.orders?.rfqs?.quantity} {job.orders?.rfqs?.unit}</span>
                        </div>
                      </div>
                      {job.agreed_rate && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Rate</p>
                          <p className="text-xl font-bold text-primary">
                            R {job.agreed_rate.toLocaleString("en-ZA")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="font-medium">Pickup</span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-5">
                          {job.pickup_city || job.pickup_address}
                        </p>
                      </div>
                      <Navigation className="h-5 w-5 text-muted-foreground rotate-90" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="font-medium">Delivery</span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-5">
                          {job.delivery_city || job.delivery_address}
                        </p>
                      </div>
                      {job.distance_km && (
                        <div className="text-right">
                          <p className="font-semibold">{job.distance_km} km</p>
                        </div>
                      )}
                    </div>

                    {/* Actions based on status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        {job.delivered_at ? (
                          <span>Delivered {new Date(job.delivered_at).toLocaleDateString()}</span>
                        ) : job.pickup_scheduled_at ? (
                          <span>Picked up {new Date(job.pickup_scheduled_at).toLocaleDateString()}</span>
                        ) : (
                          <span>Assigned {new Date(job.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {job.status === "assigned" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateJobStatus(job.id, "in_transit")}
                          >
                            Start Delivery
                            <Truck className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                        {job.status === "in_transit" && (
                          <Button 
                            size="sm"
                            onClick={() => updateJobStatus(job.id, "delivered")}
                          >
                            Mark Delivered
                            <CheckCircle2 className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                        {job.status === "delivered" && !job.pod_url && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setUploadingJobId(job.id);
                              fileInputRef.current?.click();
                            }}
                            disabled={uploadingJobId === job.id}
                          >
                            {uploadingJobId === job.id ? "Uploading..." : "Upload POD"}
                            <Camera className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                        {job.pod_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={job.pod_url} target="_blank" rel="noopener noreferrer">
                              View POD
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
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

