"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

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

interface SupplierQuote {
  id: string;
  price_per_unit: number;
  total_price: number;
  lead_time_days: number;
  valid_until: string;
  is_selected: boolean;
  created_at: string;
  rfqs: {
    id: string;
    reference_number: string;
    product_name: string;
    quantity: number;
    unit: string;
    delivery_city: string;
    status: string;
  } | null;
}

export default function MyQuotesPage() {
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, selected: 0, pending: 0 });

  useEffect(() => {
    const fetchQuotes = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("supplier_quotes")
        .select(`
          id,
          price_per_unit,
          total_price,
          lead_time_days,
          valid_until,
          is_selected,
          created_at,
          rfqs (
            id,
            reference_number,
            product_name,
            quantity,
            unit,
            delivery_city,
            status
          )
        `)
        .eq("supplier_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setQuotes(data);
        setStats({
          total: data.length,
          selected: data.filter(q => q.is_selected).length,
          pending: data.filter(q => !q.is_selected && new Date(q.valid_until) > new Date()).length,
        });
      }
      setLoading(false);
    };

    fetchQuotes();
  }, []);

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.rfqs?.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.rfqs?.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "selected") return matchesSearch && quote.is_selected;
    if (statusFilter === "pending") return matchesSearch && !quote.is_selected && new Date(quote.valid_until) > new Date();
    if (statusFilter === "expired") return matchesSearch && !quote.is_selected && new Date(quote.valid_until) <= new Date();
    return matchesSearch;
  });

  const getQuoteStatus = (quote: SupplierQuote) => {
    if (quote.is_selected) {
      return { label: "Selected", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
    }
    if (new Date(quote.valid_until) <= new Date()) {
      return { label: "Expired", color: "bg-gray-100 text-gray-700", icon: XCircle };
    }
    return { label: "Pending", color: "bg-blue-100 text-blue-700", icon: Clock };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
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
          <h1 className="text-2xl font-bold tracking-tight">My Quotes</h1>
          <p className="text-muted-foreground">
            Track your submitted quotations
          </p>
        </div>
        <Button asChild>
          <Link href="/quotes">
            <FileText className="mr-2 h-4 w-4" />
            Browse Requests
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quotes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Won / Selected
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.selected}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.selected / stats.total) * 100) : 0}% win rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
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
            <SelectItem value="all">All Quotes</SelectItem>
            <SelectItem value="selected">Selected / Won</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Quotes Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Start quoting on open requests"}
            </p>
            <Button asChild>
              <Link href="/quotes">Browse Open Requests</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredQuotes.map((quote) => {
            const status = getQuoteStatus(quote);
            const StatusIcon = status.icon;

            return (
              <Card key={quote.id} className={`hover:shadow-md transition-shadow ${quote.is_selected ? "border-green-200" : ""}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {quote.rfqs?.reference_number}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-lg truncate">
                        {quote.rfqs?.product_name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        <span>{quote.rfqs?.quantity} {quote.rfqs?.unit}</span>
                        <span>•</span>
                        <span>{quote.rfqs?.delivery_city}</span>
                        <span>•</span>
                        <span>Quoted {new Date(quote.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Your Quote</p>
                        <p className="text-xl font-bold">
                          R {quote.total_price.toLocaleString("en-ZA")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          R {quote.price_per_unit.toLocaleString("en-ZA")} / {quote.rfqs?.unit}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/quotes/${quote.rfqs?.id}`}>
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

