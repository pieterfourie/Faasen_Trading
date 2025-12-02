"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  FileText,
  Eye,
  Calculator,
  CheckCircle2,
  MapPin,
  Percent,
  Truck,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

interface RFQ {
  id: string;
  reference_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  delivery_city: string;
  status: string;
  created_at: string;
  profiles: { company_name: string } | null;
  product_categories: { name: string } | null;
  quote_count: number;
}

interface SupplierQuote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  price_per_unit: number;
  total_price: number;
  lead_time_days: number;
  is_selected: boolean;
  profiles: { company_name: string; city: string | null } | null;
  supplier_city: string | null; // From supplier_products
}

interface PricePreview {
  supplierCost: number;
  marginPercent: number;
  marginAmount: number;
  logisticsFee: number;
  subtotal: number;
  vatAmount: number;
  finalTotal: number;
}

// Major SA Cities for dropdowns
const SA_CITIES = [
  "Johannesburg", "Pretoria", "Cape Town", "Durban", "Port Elizabeth",
  "East London", "Bloemfontein", "Kimberley", "Nelspruit", "Polokwane",
  "Rustenburg", "Potchefstroom", "Mahikeng", "Upington", "George",
  "Pietermaritzburg", "Richards Bay", "Newcastle", "Witbank", "Secunda",
  "Vredendal", "Stellenbosch", "Paarl", "Worcester", "Mossel Bay",
  "Knysna", "Plettenberg Bay", "Hermanus", "Saldanha", "Ladysmith",
  "Port Shepstone", "Umhlanga", "Grahamstown", "Uitenhage", "Graaff-Reinet",
  "Mthatha", "Queenstown", "Welkom", "Kroonstad", "Bethlehem",
  "Harrismith", "Springbok", "Tzaneen", "Louis Trichardt", "Mokopane",
  "Bela-Bela", "Musina", "Barberton", "White River", "Komatipoort",
  "Middelburg", "Brits", "Sun City", "Klerksdorp", "Lichtenburg",
  "Centurion", "Midrand", "Sandton", "Soweto", "Vereeniging",
  "Springs", "Benoni", "Boksburg", "Germiston"
].sort();

export default function AdminRFQsPage() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  
  // Margin calculator state
  const [selectedQuote, setSelectedQuote] = useState<SupplierQuote | null>(null);
  const [marginPercent, setMarginPercent] = useState<number>(15);
  const [pickupCity, setPickupCity] = useState<string>("");
  const [deliveryCity, setDeliveryCity] = useState<string>("");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceNotFound, setDistanceNotFound] = useState(false);
  const [logisticsRate, setLogisticsRate] = useState<number>(25);
  const [minLogisticsFee, setMinLogisticsFee] = useState<number>(1500); // Minimum R1,500 for any delivery
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);

  const VAT_PERCENT = 15;

  useEffect(() => {
    const fetchRFQs = async () => {
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

      // Fetch RFQs with buyer info
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
          profiles!rfqs_buyer_id_fkey (company_name),
          product_categories (name)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Get quote counts
        const rfqIds = data.map(r => r.id);
        const { data: quoteCounts } = await supabase
          .from("supplier_quotes")
          .select("rfq_id")
          .in("rfq_id", rfqIds);

        const countMap = new Map<string, number>();
        quoteCounts?.forEach(q => {
          countMap.set(q.rfq_id, (countMap.get(q.rfq_id) || 0) + 1);
        });

        setRfqs(data.map(r => ({
          ...r,
          quote_count: countMap.get(r.id) || 0,
        })) as unknown as RFQ[]);
      }
      setLoading(false);
    };

    fetchRFQs();
  }, [router]);

  // Lookup distance when cities change
  useEffect(() => {
    const lookupDistance = async () => {
      if (!pickupCity || !deliveryCity) {
        setDistanceKm(null);
        setDistanceNotFound(false);
        return;
      }

      if (pickupCity === deliveryCity) {
        setDistanceKm(0);
        setDistanceNotFound(false);
        return;
      }

      setDistanceLoading(true);
      setDistanceNotFound(false);

      const supabase = createClient();
      const { data } = await supabase
        .from("city_distances")
        .select("distance_km")
        .or(`and(city_from.ilike.${pickupCity},city_to.ilike.${deliveryCity}),and(city_from.ilike.${deliveryCity},city_to.ilike.${pickupCity})`)
        .limit(1)
        .single();

      if (data?.distance_km) {
        setDistanceKm(data.distance_km);
        setDistanceNotFound(false);
      } else {
        setDistanceKm(null);
        setDistanceNotFound(true);
      }
      setDistanceLoading(false);
    };

    lookupDistance();
  }, [pickupCity, deliveryCity]);

  // Calculate price preview whenever inputs change
  useEffect(() => {
    if (!selectedQuote || distanceKm === null) {
      setPricePreview(null);
      return;
    }

    const supplierCost = selectedQuote.total_price;
    const marginAmount = supplierCost * (marginPercent / 100);
    // Calculate logistics fee with minimum
    const calculatedLogistics = distanceKm * logisticsRate;
    const logisticsFee = Math.max(calculatedLogistics, minLogisticsFee);
    const subtotal = supplierCost + marginAmount + logisticsFee;
    const vatAmount = subtotal * (VAT_PERCENT / 100);
    const finalTotal = subtotal + vatAmount;

    setPricePreview({
      supplierCost,
      marginPercent,
      marginAmount,
      logisticsFee,
      subtotal,
      vatAmount,
      finalTotal,
    });
  }, [selectedQuote, marginPercent, distanceKm, logisticsRate, minLogisticsFee]);

  const fetchQuotes = async (rfq: RFQ) => {
    setLoadingQuotes(true);
    setSelectedRfq(rfq);
    setSelectedQuote(null);
    setPricePreview(null);
    setDeliveryCity(rfq.delivery_city || "");
    setPickupCity("");
    setDistanceKm(null);

    const supabase = createClient();
    const { data } = await supabase
      .from("supplier_quotes")
      .select(`
        id,
        rfq_id,
        supplier_id,
        price_per_unit,
        total_price,
        lead_time_days,
        is_selected,
        profiles!supplier_quotes_supplier_id_fkey (company_name, city)
      `)
      .eq("rfq_id", rfq.id)
      .order("total_price", { ascending: true });

    // Get supplier product locations for each quote
    if (data) {
      const enrichedQuotes = await Promise.all(data.map(async (quote) => {
        const { data: productData } = await supabase
          .from("supplier_products")
          .select("location_city")
          .eq("supplier_id", quote.supplier_id)
          .limit(1)
          .single();

        return {
          ...quote,
          supplier_city: (quote.profiles as { city?: string })?.city || productData?.location_city || null,
        };
      }));

      setQuotes(enrichedQuotes as unknown as SupplierQuote[]);
    } else {
      setQuotes([]);
    }
    setLoadingQuotes(false);
  };

  const selectQuote = (quote: SupplierQuote) => {
    setSelectedQuote(quote);
    // Auto-set pickup city from supplier location
    if (quote.supplier_city) {
      setPickupCity(quote.supplier_city);
    }
  };

  const createClientOffer = async () => {
    if (!selectedQuote || !pricePreview || distanceKm === null) return;
    
    setCreatingOffer(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Session expired");
        return;
      }

      // Call the Edge Function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-client-offer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            supplier_quote_id: selectedQuote.id,
            margin_percent: marginPercent,
            logistics_rate_per_km: logisticsRate,
            distance_km: distanceKm,
            min_logistics_fee: minLogisticsFee,
            valid_days: 7,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create offer");
      }

      toast.success(`Client offer created! Final price: R${result.breakdown.final_total.toLocaleString()}`);
      
      // Reset calculator
      setSelectedQuote(null);
      setPricePreview(null);
      
      // Refresh the quotes
      if (selectedRfq) {
        fetchQuotes(selectedRfq);
      }

      // Update RFQ status in the list
      setRfqs(prev =>
        prev.map(r =>
          r.id === selectedRfq?.id ? { ...r, status: "quoted" } : r
        )
      );
    } catch (error: unknown) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create offer");
    } finally {
      setCreatingOffer(false);
    }
  };

  const filteredRFQs = rfqs.filter((rfq) => {
    const matchesSearch =
      rfq.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    sourcing: "bg-yellow-100 text-yellow-700",
    quoted: "bg-purple-100 text-purple-700",
    accepted: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-700",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
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
          <h1 className="text-2xl font-bold tracking-tight">Manage RFQs</h1>
          <p className="text-muted-foreground">
            Review supplier quotes and create client offers with custom margins
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RFQs..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="sourcing">Sourcing</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content - Three Column View */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* RFQ List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">RFQ List</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filteredRFQs.map((rfq) => (
              <Card
                key={rfq.id}
                className={`cursor-pointer transition-all ${
                  selectedRfq?.id === rfq.id ? "ring-2 ring-primary" : "hover:shadow-md"
                }`}
                onClick={() => fetchQuotes(rfq)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {rfq.reference_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[rfq.status] || statusColors.new}`}>
                          {rfq.status}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm truncate">{rfq.product_name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{rfq.quantity} {rfq.unit}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {rfq.delivery_city}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs">
                      <FileText className="h-3 w-3" />
                      {rfq.quote_count}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quotes Panel */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Supplier Quotes</h2>
          {!selectedRfq ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm">Select an RFQ to view quotes</p>
              </CardContent>
            </Card>
          ) : loadingQuotes ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No quotes received yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {quotes.map((quote, index) => (
                <Card
                  key={quote.id}
                  className={`cursor-pointer transition-all ${
                    quote.is_selected 
                      ? "border-green-500 bg-green-50" 
                      : selectedQuote?.id === quote.id 
                        ? "ring-2 ring-accent" 
                        : "hover:shadow-md"
                  }`}
                  onClick={() => !quote.is_selected && selectQuote(quote)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {index === 0 && !quote.is_selected && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Best Price
                        </span>
                      )}
                      {quote.is_selected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Offer Created
                        </span>
                      )}
                      {selectedQuote?.id === quote.id && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                          Selected
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm">
                      {(quote.profiles as { company_name?: string })?.company_name || "Unknown Supplier"}
                    </h4>
                    {quote.supplier_city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {quote.supplier_city}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Per unit: </span>
                        <span className="font-medium">R{quote.price_per_unit.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-bold text-primary">R{quote.total_price.toLocaleString()}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Lead time: </span>
                        <span>{quote.lead_time_days} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Margin Calculator */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Margin Calculator</h2>
          {!selectedQuote ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm text-center">
                  Select a supplier quote to calculate your margin
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Set Your Price
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier Cost (Read-only) */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Supplier Cost</span>
                    <span className="font-bold">R {selectedQuote.total_price.toLocaleString()}</span>
                  </div>
                </div>

                {/* Margin Input */}
                <div className="space-y-2">
                  <Label htmlFor="margin" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Your Margin (%)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="margin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(Number(e.target.value))}
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      {[10, 15, 20, 25].map((m) => (
                        <Button
                          key={m}
                          type="button"
                          variant={marginPercent === m ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMarginPercent(m)}
                        >
                          {m}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Route Selection */}
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Logistics Route
                  </Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pickup (Supplier)</Label>
                      <Select value={pickupCity} onValueChange={setPickupCity}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {SA_CITIES.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Delivery (Buyer)</Label>
                      <Select value={deliveryCity} onValueChange={setDeliveryCity}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {SA_CITIES.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Distance Display */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm">Distance:</span>
                    {distanceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : distanceNotFound ? (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <Input
                          type="number"
                          className="w-20 h-7 text-sm"
                          placeholder="km"
                          value={distanceKm || ""}
                          onChange={(e) => setDistanceKm(Number(e.target.value) || null)}
                        />
                        <span className="text-xs text-muted-foreground">km</span>
                      </div>
                    ) : distanceKm !== null ? (
                      <span className="font-bold text-primary">{distanceKm} km</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Select cities</span>
                    )}
                  </div>

                  {distanceNotFound && (
                    <p className="text-xs text-amber-600">
                      Route not in database. Enter distance manually.
                    </p>
                  )}
                </div>

                {/* Logistics Rate Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rate" className="text-xs">Rate per km (R)</Label>
                    <Input
                      id="rate"
                      type="number"
                      min="0"
                      step="0.5"
                      value={logisticsRate}
                      onChange={(e) => setLogisticsRate(Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="minFee" className="text-xs">Minimum Fee (R)</Label>
                    <Input
                      id="minFee"
                      type="number"
                      min="0"
                      step="100"
                      value={minLogisticsFee}
                      onChange={(e) => setMinLogisticsFee(Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Price Preview */}
                {pricePreview && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-3">Price Breakdown (Admin View Only)</h4>
                    
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Supplier Cost</span>
                        <span>R {pricePreview.supplierCost.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>+ Your Margin ({pricePreview.marginPercent}%)</span>
                        <span>R {pricePreview.marginAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          + Logistics {distanceKm === 0 || (distanceKm! * logisticsRate < minLogisticsFee) 
                            ? "(min fee)" 
                            : `(${distanceKm}km × R${logisticsRate})`}
                        </span>
                        <span>R {pricePreview.logisticsFee.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>R {pricePreview.subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+ VAT (15%)</span>
                        <span>R {pricePreview.vatAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Final Totals */}
                    <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Buyer Pays</span>
                        <span className="text-2xl font-bold text-primary">
                          R {pricePreview.finalTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Your Profit</span>
                        <span className="font-bold">
                          R {pricePreview.marginAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={createClientOffer}
                      disabled={creatingOffer || distanceKm === null}
                    >
                      {creatingOffer ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Offer...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Create Offer for Buyer
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Buyer will only see the final price (R {pricePreview.finalTotal.toLocaleString()})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
