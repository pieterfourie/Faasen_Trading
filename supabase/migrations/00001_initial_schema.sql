-- =====================================================
-- Faasen Trading: Initial Database Schema
-- =====================================================
-- A blind B2B supply chain brokerage platform
-- SECURITY: Buyers must NEVER see supplier information
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'buyer', 'supplier', 'transporter');

CREATE TYPE rfq_status AS ENUM (
  'new',
  'sourcing',
  'quoted',
  'accepted',
  'payment_verified',
  'in_transit',
  'delivered',
  'completed',
  'cancelled'
);

CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

CREATE TYPE logistics_status AS ENUM (
  'pending',
  'assigned',
  'pickup_scheduled',
  'in_transit',
  'delivered',
  'pod_uploaded',
  'completed'
);

-- =====================================================
-- TABLE: profiles
-- User profiles linked to Supabase Auth
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'buyer',
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  vat_number TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: product_categories
-- Supplier specializations (e.g., Cement, Steel, etc.)
-- =====================================================

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: supplier_categories
-- Junction table: which suppliers can supply which products
-- =====================================================

CREATE TABLE supplier_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, category_id)
);

-- =====================================================
-- TABLE: rfqs (Request for Quotation)
-- Buyer requests - the starting point of every deal
-- =====================================================

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference_number TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_category_id UUID REFERENCES product_categories(id),
  quantity DECIMAL(12, 2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'tons',
  delivery_address TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_province TEXT NOT NULL,
  delivery_postal_code TEXT,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  required_by DATE,
  additional_notes TEXT,
  status rfq_status DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: supplier_quotes
-- ⚠️ CRITICAL: This table is HIDDEN from buyers
-- Contains supplier pricing - the core of our blind broker model
-- =====================================================

CREATE TABLE supplier_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price_per_unit DECIMAL(12, 2) NOT NULL, -- Supplier's price in ZAR
  total_price DECIMAL(14, 2) NOT NULL,    -- price_per_unit * quantity
  lead_time_days INTEGER,
  valid_until DATE NOT NULL,
  notes TEXT,
  is_selected BOOLEAN DEFAULT FALSE,      -- Did admin select this quote?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)             -- One quote per supplier per RFQ
);

-- =====================================================
-- TABLE: client_offers
-- What the BUYER sees - with margin applied
-- No supplier information exposed here!
-- =====================================================

CREATE TABLE client_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  -- FK to supplier_quote but NEVER exposed to buyer via RLS
  selected_supplier_quote_id UUID REFERENCES supplier_quotes(id),
  
  -- Pricing breakdown (all in ZAR)
  base_cost DECIMAL(14, 2) NOT NULL,           -- supplier_total (hidden calculation)
  margin_percent DECIMAL(5, 2) NOT NULL,       -- e.g., 15.00 for 15%
  margin_amount DECIMAL(14, 2) NOT NULL,       -- base_cost * margin_percent
  logistics_fee DECIMAL(12, 2) NOT NULL,       -- distance * rate
  subtotal DECIMAL(14, 2) NOT NULL,            -- base + margin + logistics
  vat_percent DECIMAL(5, 2) DEFAULT 15.00,     -- SA VAT rate
  vat_amount DECIMAL(14, 2) NOT NULL,          -- subtotal * vat_rate
  final_total DECIMAL(14, 2) NOT NULL,         -- What buyer pays
  
  -- Delivery info
  estimated_delivery_days INTEGER,
  valid_until DATE NOT NULL,
  
  status offer_status DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: orders
-- Confirmed deals after buyer accepts client_offer
-- =====================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  client_offer_id UUID NOT NULL REFERENCES client_offers(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Financials snapshot (frozen at time of order)
  total_amount DECIMAL(14, 2) NOT NULL,
  vat_amount DECIMAL(14, 2) NOT NULL,
  
  -- Payment tracking
  payment_status TEXT DEFAULT 'pending',
  payment_reference TEXT,
  payment_verified_at TIMESTAMPTZ,
  
  -- Document URLs (stored in Supabase Storage)
  buyer_invoice_url TEXT,
  supplier_po_url TEXT,
  
  status rfq_status DEFAULT 'accepted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: logistics_jobs
-- Transport assignments for confirmed orders
-- =====================================================

CREATE TABLE logistics_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transporter_id UUID REFERENCES profiles(id),
  
  -- Route info
  pickup_address TEXT NOT NULL,
  pickup_city TEXT,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  delivery_address TEXT NOT NULL,
  delivery_city TEXT,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  distance_km DECIMAL(10, 2),
  
  -- Pricing
  agreed_rate DECIMAL(12, 2),  -- What we pay the transporter
  
  -- Scheduling
  pickup_scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Proof of Delivery
  pod_url TEXT,
  pod_uploaded_at TIMESTAMPTZ,
  
  status logistics_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: documents
-- Document vault for all deal-related files
-- =====================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'invoice', 'po', 'pod', 'receipt', 'quote'
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX idx_rfqs_buyer_id ON rfqs(buyer_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_supplier_quotes_rfq_id ON supplier_quotes(rfq_id);
CREATE INDEX idx_supplier_quotes_supplier_id ON supplier_quotes(supplier_id);
CREATE INDEX idx_client_offers_rfq_id ON client_offers(rfq_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_logistics_jobs_order_id ON logistics_jobs(order_id);
CREATE INDEX idx_logistics_jobs_transporter_id ON logistics_jobs(transporter_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ⚠️ THE GOLDEN RULES ENFORCEMENT
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Helper function to get current user's role
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- -----------------------------------------------------
-- PROFILES: Users can see their own profile
-- Admins can see all profiles
-- -----------------------------------------------------

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can insert/update any profile
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (get_user_role() = 'admin');

-- -----------------------------------------------------
-- PRODUCT_CATEGORIES: Everyone can read
-- -----------------------------------------------------

CREATE POLICY "Anyone can view categories"
  ON product_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON product_categories FOR ALL
  USING (get_user_role() = 'admin');

-- -----------------------------------------------------
-- SUPPLIER_CATEGORIES: Suppliers see their own
-- -----------------------------------------------------

CREATE POLICY "Suppliers can view own categories"
  ON supplier_categories FOR SELECT
  USING (supplier_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Admins can manage supplier categories"
  ON supplier_categories FOR ALL
  USING (get_user_role() = 'admin');

-- -----------------------------------------------------
-- RFQs: Buyers see their own, Suppliers see all (for sourcing)
-- Admins see all
-- -----------------------------------------------------

CREATE POLICY "Buyers can view own RFQs"
  ON rfqs FOR SELECT
  USING (
    buyer_id = auth.uid() 
    OR get_user_role() = 'admin'
    OR get_user_role() = 'supplier'  -- Suppliers can see RFQs to quote on
  );

CREATE POLICY "Buyers can create RFQs"
  ON rfqs FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid() 
    AND get_user_role() = 'buyer'
  );

CREATE POLICY "Admins can manage RFQs"
  ON rfqs FOR ALL
  USING (get_user_role() = 'admin');

-- -----------------------------------------------------
-- ⚠️ SUPPLIER_QUOTES: THE CRITICAL BLIND BROKER POLICY
-- Buyers must NEVER see this table!
-- -----------------------------------------------------

-- Suppliers can only see their own quotes
CREATE POLICY "Suppliers can view own quotes"
  ON supplier_quotes FOR SELECT
  USING (
    supplier_id = auth.uid() 
    OR get_user_role() = 'admin'
  );

-- Suppliers can create quotes for RFQs
CREATE POLICY "Suppliers can create quotes"
  ON supplier_quotes FOR INSERT
  WITH CHECK (
    supplier_id = auth.uid() 
    AND get_user_role() = 'supplier'
  );

-- Suppliers can update their own quotes
CREATE POLICY "Suppliers can update own quotes"
  ON supplier_quotes FOR UPDATE
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins can manage supplier quotes"
  ON supplier_quotes FOR ALL
  USING (get_user_role() = 'admin');

-- ⛔ NO POLICY FOR BUYERS - They cannot see supplier_quotes AT ALL

-- -----------------------------------------------------
-- CLIENT_OFFERS: What buyers actually see
-- No supplier info exposed!
-- -----------------------------------------------------

CREATE POLICY "Buyers can view offers for their RFQs"
  ON client_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rfqs 
      WHERE rfqs.id = client_offers.rfq_id 
      AND rfqs.buyer_id = auth.uid()
    )
    OR get_user_role() = 'admin'
  );

-- Buyers can accept/reject offers (update status)
CREATE POLICY "Buyers can respond to offers"
  ON client_offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rfqs 
      WHERE rfqs.id = client_offers.rfq_id 
      AND rfqs.buyer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rfqs 
      WHERE rfqs.id = client_offers.rfq_id 
      AND rfqs.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage client offers"
  ON client_offers FOR ALL
  USING (get_user_role() = 'admin');

-- -----------------------------------------------------
-- ORDERS: Buyers see their own orders
-- -----------------------------------------------------

CREATE POLICY "Buyers can view own orders"
  ON orders FOR SELECT
  USING (
    buyer_id = auth.uid() 
    OR get_user_role() = 'admin'
  );

CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  USING (get_user_role() = 'admin');

-- -----------------------------------------------------
-- LOGISTICS_JOBS: Transporters see their assigned jobs
-- -----------------------------------------------------

CREATE POLICY "Transporters can view assigned jobs"
  ON logistics_jobs FOR SELECT
  USING (
    transporter_id = auth.uid() 
    OR get_user_role() = 'admin'
  );

CREATE POLICY "Transporters can update their jobs"
  ON logistics_jobs FOR UPDATE
  USING (transporter_id = auth.uid())
  WITH CHECK (transporter_id = auth.uid());

CREATE POLICY "Admins can manage logistics jobs"
  ON logistics_jobs FOR ALL
  USING (get_user_role() = 'admin');

-- -----------------------------------------------------
-- DOCUMENTS: Users see documents for their deals
-- -----------------------------------------------------

CREATE POLICY "Users can view related documents"
  ON documents FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = documents.order_id 
      AND orders.buyer_id = auth.uid()
    )
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  USING (get_user_role() = 'admin');

-- =====================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rfqs_updated_at
  BEFORE UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER supplier_quotes_updated_at
  BEFORE UPDATE ON supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER client_offers_updated_at
  BEFORE UPDATE ON client_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER logistics_jobs_updated_at
  BEFORE UPDATE ON logistics_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- FUNCTION: Generate reference numbers
-- =====================================================

CREATE OR REPLACE FUNCTION generate_rfq_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reference_number = 'RFQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(NEXTVAL('rfq_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS rfq_seq START 1;

CREATE TRIGGER rfq_reference_trigger
  BEFORE INSERT ON rfqs
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION generate_rfq_reference();

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(NEXTVAL('order_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE TRIGGER order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- SEED DATA: Initial product categories
-- =====================================================

INSERT INTO product_categories (name, description) VALUES
  ('Cement', 'Portland cement and related products'),
  ('Steel', 'Structural steel, rebar, and metal products'),
  ('Timber', 'Lumber, plywood, and wood products'),
  ('Aggregates', 'Sand, gravel, and crushed stone'),
  ('Bricks & Blocks', 'Building blocks and bricks'),
  ('Roofing', 'Roofing sheets, tiles, and materials'),
  ('Plumbing', 'Pipes, fittings, and plumbing supplies'),
  ('Electrical', 'Cables, conduits, and electrical supplies'),
  ('Paint', 'Paints, coatings, and finishes'),
  ('Hardware', 'Fasteners, tools, and general hardware');

-- =====================================================
-- 🎉 Schema Complete!
-- Faasen Trading is ready to broker some deals.
-- =====================================================

