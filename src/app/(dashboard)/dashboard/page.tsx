"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  ShoppingCart,
  TrendingUp,
  Clock,
  ArrowUpRight,
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

      // Get stats based on role
      // For now, just show placeholder stats
      setStats({
        totalRfqs: 12,
        activeOrders: 3,
        pendingQuotes: 5,
        completedDeals: 24,
      });

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
              <span className="text-green-600 font-medium">+2</span> from last week
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
              {[
                { title: "RFQ #2024-0012 submitted", time: "2 hours ago", status: "new" },
                { title: "Quote received for Steel order", time: "5 hours ago", status: "quoted" },
                { title: "Order #ORD-2024-0008 delivered", time: "1 day ago", status: "completed" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
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

