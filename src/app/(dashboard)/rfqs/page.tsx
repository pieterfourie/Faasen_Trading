"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
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

interface RFQ {
  id: string;
  reference_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  delivery_city: string;
  status: string;
  created_at: string;
  product_categories?: { name: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700", icon: FileText },
  sourcing: { label: "Sourcing", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  quoted: { label: "Quoted", color: "bg-purple-100 text-purple-700", icon: Package },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const fetchRFQs = async () => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("rfqs")
        .select(`
          id,
          reference_number,
          product_name,
          quantity,
          unit,
          delivery_city,
          status,
          created_at,
          product_categories (name)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRfqs(data);
      }
      setLoading(false);
    };

    fetchRFQs();
  }, []);

  const filteredRFQs = rfqs.filter((rfq) => {
    const matchesSearch =
      rfq.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
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
          <h1 className="text-2xl font-bold tracking-tight">My RFQs</h1>
          <p className="text-muted-foreground">
            Manage your requests for quotation
          </p>
        </div>
        <Button asChild>
          <Link href="/rfqs/new">
            <Plus className="mr-2 h-4 w-4" />
            New RFQ
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference or product..."
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
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="sourcing">Sourcing</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* RFQ List */}
      {filteredRFQs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No RFQs Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first request for quotation"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button asChild>
                <Link href="/rfqs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create RFQ
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRFQs.map((rfq) => {
            const status = statusConfig[rfq.status] || statusConfig.new;
            const StatusIcon = status.icon;
            
            return (
              <Card key={rfq.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {rfq.reference_number}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg truncate">
                        {rfq.product_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        <span>{rfq.quantity} {rfq.unit}</span>
                        <span>•</span>
                        <span>Deliver to {rfq.delivery_city}</span>
                        <span>•</span>
                        <span>{new Date(rfq.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/rfqs/${rfq.id}`}>
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
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

