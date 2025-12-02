import Link from "next/link";
import { ArrowRight, Package2, Shield, Zap, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Package2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Faasen Trading</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </Link>
            <Link href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Now serving 500+ businesses across South Africa
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Your Trusted Partner in{" "}
            <span className="text-primary">Supply Chain</span>{" "}
            Brokerage
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect with verified suppliers, get competitive quotes, and streamline your procurement. 
            All in one platform built for South African businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/register">
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="#how-it-works">
                See How it Works
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Verified Suppliers</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm">24hr Quote Response</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">R50M+ Transactions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything You Need to Procure Smarter
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From request to delivery, we handle the complexity so you can focus on your business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Request Quotes",
                description: "Submit your requirements and receive competitive quotes from multiple verified suppliers within 24 hours.",
                icon: "📝",
              },
              {
                title: "Compare & Select",
                description: "Review quotes with transparent pricing. No hidden fees, no surprises — just clear, competitive pricing.",
                icon: "⚖️",
              },
              {
                title: "Track Delivery",
                description: "Monitor your orders in real-time from purchase to delivery with full visibility at every step.",
                icon: "🚚",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-8 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Simple Process, Powerful Results
            </h2>
            <p className="text-muted-foreground">
              Get started in minutes and receive your first quote within 24 hours.
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Submit Your Request",
                description: "Tell us what you need — product, quantity, and delivery location. Our platform matches you with the right suppliers.",
              },
              {
                step: "02",
                title: "Receive Competitive Quotes",
                description: "Verified suppliers respond with their best prices. You'll see a clear, all-inclusive quote with no hidden fees.",
              },
              {
                step: "03",
                title: "Confirm & Track",
                description: "Accept the quote that works for you. We handle supplier coordination, logistics, and deliver to your door.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-faasen rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ready to Transform Your Procurement?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of South African businesses already saving time and money with Faasen Trading.
            </p>
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base" asChild>
              <Link href="/register">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Package2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Faasen Trading</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 Faasen Trading (Pty) Ltd
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
