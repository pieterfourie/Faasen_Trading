"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package2,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Truck,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  FlaskConical,
  User,
  Building2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UserRole = "admin" | "buyer" | "supplier" | "transporter";

interface Profile {
  id: string;
  email: string;
  role: UserRole;
  company_name: string;
  contact_person: string | null;
}

const navigationByRole: Record<UserRole, { name: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Admin Panel", href: "/admin", icon: Settings },
    { name: "Supplier Catalog", href: "/admin/catalog", icon: ShoppingCart },
    { name: "Manage RFQs", href: "/admin/rfqs", icon: FileText },
    { name: "Manage Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Manage Users", href: "/admin/users", icon: Settings },
    { name: "Available Jobs", href: "/jobs", icon: Truck },
    { name: "Active Deliveries", href: "/my-jobs", icon: Truck },
    { name: "Settings", href: "/settings", icon: Settings },
  ],
  buyer: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My RFQs", href: "/rfqs", icon: FileText },
    { name: "My Orders", href: "/orders", icon: ShoppingCart },
    { name: "Settings", href: "/settings", icon: Settings },
  ],
  supplier: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Products", href: "/products", icon: ShoppingCart },
    { name: "Quote Requests", href: "/quotes", icon: FileText },
    { name: "My Quotes", href: "/my-quotes", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ],
  transporter: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Available Jobs", href: "/jobs", icon: Truck },
    { name: "My Jobs", href: "/my-jobs", icon: ShoppingCart },
    { name: "Settings", href: "/settings", icon: Settings },
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
      setLoading(false);
    };

    getProfile();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profile?.id);

    if (error) {
      toast.error("Failed to switch role");
      return;
    }

    setProfile(prev => prev ? { ...prev, role: newRole } : null);
    toast.success(`Switched to ${newRole} role`);
    router.push("/dashboard");
    router.refresh();
  };

  const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
    admin: { label: "Admin", icon: ShieldCheck, color: "text-red-500" },
    buyer: { label: "Buyer", icon: User, color: "text-blue-500" },
    supplier: { label: "Supplier", icon: Building2, color: "text-green-500" },
    transporter: { label: "Transporter", icon: Truck, color: "text-orange-500" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const navigation = profile ? navigationByRole[profile.role] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Package2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-foreground">Faasen</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Demo Mode - Role Switcher */}
          <div className="p-4 mx-4 mb-2 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 border border-accent/30">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Demo Mode</span>
            </div>
            <Select value={profile?.role} onValueChange={(value) => handleRoleSwitch(value as UserRole)}>
              <SelectTrigger className="w-full bg-background/80 border-accent/30">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                  const config = roleConfig[role];
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <config.icon className={cn("h-4 w-4", config.color)} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
              Switch roles to explore all features of the platform
            </p>
          </div>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {profile?.company_name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.company_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.role}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 mt-2 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-card/80 backdrop-blur-sm border-b">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
            </Button>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.contact_person || profile?.company_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

