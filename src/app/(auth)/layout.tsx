import { Package2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col bg-gradient-faasen text-white p-12 relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Package2 className="w-6 h-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Faasen Trading</span>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight mb-6">
            South Africa's Trusted Supply Chain Partner
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Connect with verified suppliers, get competitive quotes, and streamline your procurement — all in one platform.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-white/20">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-white/70 text-sm mt-1">Verified Suppliers</div>
            </div>
            <div>
              <div className="text-3xl font-bold">R50M+</div>
              <div className="text-white/70 text-sm mt-1">Transactions</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24hr</div>
              <div className="text-white/70 text-sm mt-1">Avg Quote Time</div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-white/60 text-sm z-10">
          © 2024 Faasen Trading (Pty) Ltd. All rights reserved.
        </div>
      </div>
      
      {/* Right side - Auth form */}
      <div className="flex flex-col justify-center p-8 lg:p-12 bg-gradient-faasen-light">
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Package2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">Faasen Trading</span>
        </div>
        
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

