# Database Schema Plan (Supabase/Postgres)

## Tables

1.  **profiles**
    - id, email, role (admin, buyer, supplier, transporter), company_name, vat_number.

2.  **rfqs** (Requests)
    - id, buyer_id, product_name, quantity, delivery_location_lat, delivery_location_lng, status.

3.  **supplier_quotes** (Hidden from Buyer)
    - id, rfq_id, supplier_id, price_per_unit, lead_time, valid_until.

4.  **client_offers** (Visible to Buyer)
    - id, rfq_id, selected_supplier_quote_id (FK), applied_margin_percent, logistics_fee, final_price_total, status (pending, accepted, rejected).

5.  **logistics_jobs**
    - id, order_id, transporter_id, pickup_address, delivery_address, agreed_rate, pod_url.

## Security (RLS)
- **Buyers** can ONLY see rows in `client_offers` where `buyer_id` matches theirs.
- **Buyers** must NEVER have read access to `supplier_quotes`.