# Logic Controller & Margin Engine

## The Pricing Algorithm
When a Supplier submits a quote (`sq`), the system calculates the Client Offer (`co`):

```python
# Pseudo-code logic
def calculate_client_price(supplier_price, quantity, distance_km):
    base_cost = supplier_price * quantity
    
    # Faasen Logic
    margin_percent = 0.15 # Default 15%
    logistics_rate_per_km = 25 # R25 per km for trucking
    
    logistics_cost = distance_km * logistics_rate_per_km
    faasen_profit = base_cost * margin_percent
    
    final_client_price = base_cost + faasen_profit + logistics_cost
    
    return final_client_price