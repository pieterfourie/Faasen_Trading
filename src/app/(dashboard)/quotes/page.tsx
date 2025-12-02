"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  FileText,
  Clock,
  MapPin,
  Package,
  ArrowRight,
  Calendar,
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

interface RFQ {
  id: string;
  reference_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  delivery_city: string;
  delivery_province: string;
  required_by: string | null;
  status: string;
  created_at: string;
  product_categories?: { name: string } | null;
  has_quoted?: boolean;
}

export default function QuoteRequestsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    const fetchRFQs = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get RFQs that are in sourcing status (open for quotes)
      const { data: rfqData, error } = await supabase
        .from("rfqs")
        .select(`
          id,
          reference_number,
          product_name,
          quantity,
          unit,
          delivery_city,
          delivery_province,
          required_by,
          status,
          created_at,
          product_categories (name)
        `)
        .in("status", ["new", "sourcing"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching RFQs:", error);
        setLoading(false);
        return;
      }

      // Check which RFQs the supplier has already quoted on
      const { data: existingQuotes } = await supabase
        .from("supplier_quotes")
        .select("rfq_id")
        .eq("supplier_id", user.id);

      const quotedRfqIds = new Set(existingQuotes?.map(q => q.rfq_id) || []);

      const rfqsWithQuoteStatus = (rfqData || []).map(rfq => ({
        ...rfq,
        has_quoted: quotedRfqIds.has(rfq.id),
      }));

      setRfqs(rfqsWithQuoteStatus as unknown as RFQ[]);
      setLoading(false);
    };

    fetchRFQs();
  }, []);

  const filteredRFQs = rfqs.filter((rfq) => {
    const matchesSearch =
      rfq.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || 
      rfq.product_categories?.name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(rfqs.map(r => r.product_categories?.name).filter(Boolean)));

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
        <h1 className="text-2xl font-bold tracking-tight">Quote Requests</h1>
        <p className="text-muted-foreground">
          Open RFQs waiting for your competitive quotes
        </p>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat!}>
                {cat}
              </SelectItem>
            ))}
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
            <h3 className="text-lg font-semibold mb-2">No Open Requests</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Check back later for new quote opportunities"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRFQs.map((rfq) => (
            <Card 
              key={rfq.id} 
              className={`hover:shadow-md transition-shadow ${rfq.has_quoted ? 'border-green-200 bg-green-50/50' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {rfq.reference_number}
                      </span>
                      {rfq.product_categories?.name && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {rfq.product_categories.name}
                        </span>
                      )}
                      {rfq.has_quoted && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          ✓ Quoted
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-3">
                      {rfq.product_name}
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{rfq.quantity} {rfq.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{rfq.delivery_city}, {rfq.delivery_province}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(rfq.created_at).toLocaleDateString()}</span>
                      </div>
                      {rfq.required_by && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {new Date(rfq.required_by).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    variant={rfq.has_quoted ? "outline" : "default"} 
                    asChild
                  >
                    <Link href={`/quotes/${rfq.id}`}>
                      {rfq.has_quoted ? "View Quote" : "Submit Quote"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

