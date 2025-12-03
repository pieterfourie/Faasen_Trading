"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  ShoppingCart,
  TrendingUp,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type UserRole = "admin" | "buyer" | "supplier" | "transporter";

interface Profile {
  role: UserRole;
  company_name: string;
  contact_person: string | null;
  is_approved: boolean;
}

interface DashboardStats {
  totalRfqs: number;
  activeOrders: number;
  pendingQuotes: number;
  completedDeals: number;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalRfqs: 0,
    activeOrders: 0,
    pendingQuotes: 0,
    completedDeals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, company_name, contact_person, is_approved")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Get real stats based on role
      if (profileData?.role === "buyer") {
        const [rfqResult, orderResult] = await Promise.all([
          supabase.from("rfqs").select("id", { count: "exact" }).eq("buyer_id", user.id),
          supabase.from("orders").select("id, status", { count: "exact" }).eq("buyer_id", user.id),
        ]);
        
        const activeOrders = orderResult.data?.filter(o => 
          !["completed", "cancelled"].includes(o.status)
        ).length || 0;
        const completedOrders = orderResult.data?.filter(o => o.status === "completed").length || 0;
        
        setStats({
          totalRfqs: rfqResult.count || 0,
          activeOrders,
          pendingQuotes: 0,
          completedDeals: completedOrders,
        });
      } else if (profileData?.role === "supplier") {
        const [quoteRequests, myQuotes] = await Promise.all([
          supabase.from("rfqs").select("id", { count: "exact" }).in("status", ["new", "sourcing"]),
          supabase.from("supplier_quotes").select("id, is_selected", { count: "exact" }).eq("supplier_id", user.id),
        ]);
        
        setStats({
          totalRfqs: quoteRequests.count || 0,
          activeOrders: myQuotes.data?.filter(q => q.is_selected).length || 0,
          pendingQuotes: myQuotes.count || 0,
          completedDeals: 0,
        });
      } else if (profileData?.role === "admin") {
        const [rfqResult, orderResult] = await Promise.all([
          supabase.from("rfqs").select("id", { count: "exact" }),
          supabase.from("orders").select("id, status", { count: "exact" }),
        ]);
        
        const activeOrders = orderResult.data?.filter(o => 
          !["completed", "cancelled"].includes(o.status)
        ).length || 0;
        const completedOrders = orderResult.data?.filter(o => o.status === "completed").length || 0;
        
        setStats({
          totalRfqs: rfqResult.count || 0,
          activeOrders,
          pendingQuotes: 0,
          completedDeals: completedOrders,
        });
      } else {
        // Transporter or default
        const jobsResult = await supabase
          .from("logistics_jobs")
          .select("id, status", { count: "exact" });
        
        const activeJobs = jobsResult.data?.filter(j => 
          !["completed", "delivered"].includes(j.status || "")
        ).length || 0;
        const completedJobs = jobsResult.data?.filter(j => 
          ["completed", "delivered"].includes(j.status || "")
        ).length || 0;
        
        setStats({
          totalRfqs: jobsResult.count || 0,
          activeOrders: activeJobs,
          pendingQuotes: 0,
          completedDeals: completedJobs,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {profile?.contact_person || profile?.company_name}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>
        
        {profile?.role === "buyer" && (
          <Button asChild>
            <Link href="/rfqs/new">
              <Plus className="mr-2 h-4 w-4" />
              New RFQ
            </Link>
          </Button>
        )}
      </div>

      {/* Approval Notice for Suppliers/Transporters */}
      {profile && !profile.is_approved && profile.role !== "buyer" && (
        <Card className="border-accent bg-accent/10">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium">Account Pending Approval</p>
              <p className="text-sm text-muted-foreground">
                Your account is being reviewed by our team. You&apos;ll receive full access once approved.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {profile?.role === "supplier" ? "Quote Requests" : "Total RFQs"}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRfqs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Quotes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDeals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest transactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.totalRfqs === 0 && stats.activeOrders === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity yet. Get started by creating your first RFQ!
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Activity feed coming soon...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {profile?.role === "buyer" && (
              <>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/rfqs/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New RFQ
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/orders">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    View My Orders
                  </Link>
                </Button>
              </>
            )}
            {profile?.role === "supplier" && (
              <>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/quotes">
                    <FileText className="mr-2 h-4 w-4" />
                    View Quote Requests
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/my-quotes">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    My Submitted Quotes
                  </Link>
                </Button>
              </>
            )}
            {profile?.role === "admin" && (
              <>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/rfqs">
                    <FileText className="mr-2 h-4 w-4" />
                    Manage RFQs
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/orders">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Manage Orders
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/settings">
                <FileText className="mr-2 h-4 w-4" />
                Account Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

