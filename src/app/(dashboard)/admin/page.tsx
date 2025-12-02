"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  ShoppingCart,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Truck,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface PendingUser {
  id: string;
  email: string;
  company_name: string;
  contact_person: string | null;
  role: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  pendingApprovals: number;
  activeRfqs: number;
  completedOrders: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingApprovals: 0,
    activeRfqs: 0,
    completedOrders: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        toast.error("Access denied. Admin only.");
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Fetch stats
      const [usersResult, pendingResult, rfqsResult, ordersResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("rfqs").select("id", { count: "exact", head: true }).in("status", ["new", "sourcing", "quoted"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        pendingApprovals: pendingResult.count || 0,
        activeRfqs: rfqsResult.count || 0,
        completedOrders: ordersResult.count || 0,
      });

      // Fetch pending users
      const { data: pending } = await supabase
        .from("profiles")
        .select("id, email, company_name, contact_person, role, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      setPendingUsers(pending || []);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to approve user");
    } else {
      toast.success("User approved successfully");
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setStats(prev => ({ ...prev, pendingApprovals: prev.pendingApprovals - 1 }));
    }
    setProcessingId(null);
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    const supabase = createClient();

    // In a real app, you might want to soft-delete or mark as rejected
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      toast.error("Failed to reject user");
    } else {
      toast.success("User rejected and removed");
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setStats(prev => ({ 
        ...prev, 
        pendingApprovals: prev.pendingApprovals - 1,
        totalUsers: prev.totalUsers - 1,
      }));
    }
    setProcessingId(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "supplier": return Building2;
      case "transporter": return Truck;
      default: return Package;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, approvals, and monitor platform activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className={stats.pendingApprovals > 0 ? "border-accent" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            {stats.pendingApprovals > 0 && (
              <p className="text-xs text-accent mt-1">Requires attention</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active RFQs
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRfqs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Orders
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Pending User Approvals
          </CardTitle>
          <CardDescription>
            Review and approve new supplier and transporter registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                return (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <RoleIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{user.company_name}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.contact_person || user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                            {user.role}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Applied {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(user.id)}
                        disabled={processingId === user.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        disabled={processingId === user.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/admin/users")}>
          <CardContent className="flex items-center gap-4 p-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Manage Users</h3>
              <p className="text-sm text-muted-foreground">View all users and roles</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/admin/rfqs")}>
          <CardContent className="flex items-center gap-4 p-6">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Manage RFQs</h3>
              <p className="text-sm text-muted-foreground">Review quotes and create offers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/admin/orders")}>
          <CardContent className="flex items-center gap-4 p-6">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Manage Orders</h3>
              <p className="text-sm text-muted-foreground">Track and fulfill orders</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

