"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Truck,
  Package,
  ArrowRight,
  Navigation,
  Box,
  Scale,
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
import { toast } from "sonner";

interface LogisticsJob {
  id: string;
  pickup_address: string;
  pickup_city: string;
  delivery_address: string;
  delivery_city: string;
  distance_km: number | null;
  agreed_rate: number | null;
  status: string;
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

export default function AvailableJobsPage() {
  const [jobs, setJobs] = useState<LogisticsJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");

  useEffect(() => {
    const fetchJobs = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if transporter or admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_approved")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "transporter" && profile?.role !== "admin") {
        toast.error("Access denied. Transporters and admins only.");
        return;
      }

      // Only check approval for transporters
      if (profile?.role === "transporter" && !profile?.is_approved) {
        toast.error("Your account is pending approval.");
        setLoading(false);
        return;
      }

      // Fetch available (unassigned) jobs with full product details
      const { data, error } = await supabase
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
        .is("transporter_id", null)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setJobs(data as unknown as LogisticsJob[]);
      }
      setLoading(false);
    };

    fetchJobs();
  }, []);

  const handleAcceptJob = async (jobId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from("logistics_jobs")
      .update({ 
        transporter_id: user.id,
        status: "assigned"
      })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to accept job");
    } else {
      toast.success("Job accepted! Check My Jobs for details.");
      setJobs(prev => prev.filter(j => j.id !== jobId));
    }
  };

  const uniqueCities = Array.from(new Set(jobs.flatMap(j => [j.pickup_city, j.delivery_city]).filter(Boolean)));

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.orders?.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.orders?.rfqs?.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.pickup_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.delivery_city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = cityFilter === "all" || 
      job.pickup_city === cityFilter || job.delivery_city === cityFilter;
    return matchesSearch && matchesCity;
  });

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
          <h1 className="text-2xl font-bold tracking-tight">Available Jobs</h1>
          <p className="text-muted-foreground">
            Browse and accept delivery jobs
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/my-jobs">
            <Truck className="mr-2 h-4 w-4" />
            My Jobs
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by location or product..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {uniqueCities.map((city) => (
              <SelectItem key={city} value={city!}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Available Jobs</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || cityFilter !== "all"
                ? "Try adjusting your filters"
                : "Check back later for new delivery opportunities"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  {/* Header with Order Number and Rate */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-sm text-muted-foreground">
                        {job.orders?.order_number}
                      </span>
                      {job.orders?.rfqs?.product_categories?.name && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {job.orders.rfqs.product_categories.name}
                        </span>
                      )}
                    </div>
                    {job.agreed_rate && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Your Rate</p>
                        <p className="text-2xl font-bold text-primary">
                          R {job.agreed_rate.toLocaleString("en-ZA")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cargo Details - Prominent Section */}
                  <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Box className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-primary">Cargo Details</span>
                    </div>
                    <h3 className="font-bold text-xl mb-2">
                      {job.orders?.rfqs?.product_name || "Unknown Product"}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Quantity</p>
                          <p className="font-semibold">
                            {job.orders?.rfqs?.quantity} {job.orders?.rfqs?.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Category</p>
                          <p className="font-semibold">
                            {job.orders?.rfqs?.product_categories?.name || "General"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {job.orders?.rfqs?.additional_notes && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Special Notes</p>
                            <p className="text-sm">{job.orders.rfqs.additional_notes}</p>
                          </div>
                        </div>
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
                        {job.pickup_address || job.pickup_city}
                      </p>
                    </div>
                    <Navigation className="h-5 w-5 text-muted-foreground rotate-90" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-medium">Delivery</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-5">
                        {job.delivery_address || job.delivery_city}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{job.distance_km || 0} km</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                    <Button onClick={() => handleAcceptJob(job.id)} size="lg">
                      Accept Job
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

