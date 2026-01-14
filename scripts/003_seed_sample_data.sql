-- Seed sample reports for development/demo
INSERT INTO reports (title, description, category, severity, status, latitude, longitude, address, city, state, pincode, department, estimated_cost, upvotes, created_at)
VALUES 
  ('Pothole on MG Road', 'Large pothole causing accidents near the bus stop. Multiple vehicles damaged.', 'road', 'high', 'verified', 12.9716, 77.5946, 'MG Road, Near Metro Station', 'Bangalore', 'Karnataka', '560001', 'BBMP Roads', 150000.00, 45, NOW() - INTERVAL '5 days'),
  ('Damaged Bridge Railing', 'Safety railing on flyover is broken. Pedestrians at risk.', 'bridge', 'critical', 'pending', 12.9352, 77.6245, 'Silk Board Flyover', 'Bangalore', 'Karnataka', '560029', 'NHAI', 500000.00, 89, NOW() - INTERVAL '3 days'),
  ('Water Pipeline Leak', 'Major water leak causing road damage and water wastage for weeks.', 'water', 'medium', 'in_progress', 12.9857, 77.5962, 'Cunningham Road', 'Bangalore', 'Karnataka', '560052', 'BWSSB', 75000.00, 23, NOW() - INTERVAL '7 days'),
  ('Street Light Not Working', 'Entire stretch of 500m without working street lights. Safety concern at night.', 'electrical', 'medium', 'pending', 13.0358, 77.5970, 'Hebbal Main Road', 'Bangalore', 'Karnataka', '560024', 'BESCOM', 25000.00, 34, NOW() - INTERVAL '2 days'),
  ('Drainage Overflow', 'Storm drain blocked causing flooding during rains. Businesses affected.', 'drainage', 'high', 'verified', 12.9698, 77.7500, 'Whitefield Main Road', 'Bangalore', 'Karnataka', '560066', 'BBMP Drains', 200000.00, 67, NOW() - INTERVAL '1 day'),
  ('Building Cracks', 'Government school building showing structural cracks. Students at risk.', 'building', 'critical', 'verified', 13.0827, 80.2707, 'Anna Nagar', 'Chennai', 'Tamil Nadu', '600040', 'PWD', 1500000.00, 156, NOW() - INTERVAL '10 days'),
  ('Road Resurfacing Fraud', 'Road resurfaced 2 months ago already showing damage. Substandard materials used.', 'road', 'high', 'pending', 28.6139, 77.2090, 'Connaught Place', 'Delhi', 'Delhi', '110001', 'MCD', 2000000.00, 234, NOW() - INTERVAL '4 days'),
  ('Broken Footpath', 'Footpath tiles broken and uneven. Senior citizens facing difficulty walking.', 'road', 'low', 'resolved', 19.0760, 72.8777, 'Bandra West', 'Mumbai', 'Maharashtra', '400050', 'BMC', 50000.00, 12, NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;
