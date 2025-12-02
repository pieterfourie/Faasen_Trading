# Product Requirements Document (PRD)

## 1. User Roles
- **Admin (Faasen):** Sees everything. Can override margins, select suppliers, assign transporters.
- **Buyer:** Can submit RFQs, view Client Offers, track Orders.
- **Supplier:** Can receive "Open Requests," submit Supply Quotes.
- **Transporter:** Can bid on "Logistics Jobs," upload PODs (Proof of Delivery).

## 2. The Workflow (The "Deal Loop")
1.  **RFQ:** Buyer requests "30 tons of Cement delivered to Cape Town".
2.  **Sourcing:** System notifies approved Cement Suppliers (via email/n8n).
3.  **Inbound Quote:** Supplier A quotes R2000/ton. Supplier B quotes R2100/ton.
4.  **Margin Engine:** System automatically adds 10% margin + R5000 transport fee.
5.  **Outbound Offer:** Buyer sees ONE offer: "R2700/ton (delivered)".
6.  **Acceptance:** Buyer accepts.
7.  **Split Execution:**
    - System generates PO for Supplier A.
    - System generates Transport Order for Transporter.
    - System generates Invoice for Buyer.

## 3. Dashboard Features
- **Status Pipeline:** New -> Sourcing -> Quoted -> Accepted -> Payment Verified -> In Transit -> Delivered -> Completed.
- **Document Vault:** Auto-storage for Invoices, PODs, and Receipts linked to the Deal ID.