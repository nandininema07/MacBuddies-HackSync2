-- Seed sample petitions
INSERT INTO petitions (title, description, target_signatures, signature_count, status, geographic_area, affected_population, severity_score, trending_score, total_score) VALUES
('Fix Dangerous Potholes on NH-44 Highway', 'The National Highway 44 passing through Hyderabad has developed severe potholes causing multiple accidents. We demand immediate repair and proper maintenance.', 5000, 3847, 'active', 'Hyderabad', 2500000, 0.85, 45.2, 78.5),
('Stop Illegal Construction in Green Zone', 'Unauthorized construction in the protected green belt area of Whitefield, Bangalore is destroying the environment. We need immediate government intervention.', 2000, 1523, 'active', 'Bangalore', 500000, 0.72, 32.1, 65.3),
('Repair Water Pipeline in Dharavi', 'The main water pipeline serving Dharavi has been leaking for 6 months causing water shortage for over 100,000 residents.', 3000, 2891, 'escalated', 'Mumbai', 100000, 0.95, 89.4, 92.1),
('Install Street Lights in Sector 22', 'Complete absence of street lighting in Sector 22, Gurgaon has led to increased crime and safety concerns for residents.', 1000, 456, 'active', 'Gurgaon', 50000, 0.65, 15.3, 42.8),
('Bridge Safety Inspection Demand', 'The 30-year-old Majerhat bridge requires immediate safety inspection after visible cracks appeared. Citizens demand transparent structural audit.', 10000, 8234, 'escalated', 'Kolkata', 1500000, 0.92, 78.9, 95.6);

-- Seed sample government projects
INSERT INTO government_projects (name, description, budget, department, contractor_name, city, state, status, is_verified, verification_source) VALUES
('Smart City Road Development Phase 2', 'Construction of 15km of roads with smart traffic management', 45000000, 'Urban Development', 'L&T Construction', 'Pune', 'Maharashtra', 'verified', true, 'Government Portal'),
('Community Health Center Expansion', 'Expansion of primary health center to serve 50,000 residents', 12000000, 'Health Department', 'ABC Builders', 'Chennai', 'Tamil Nadu', 'pending', false, NULL),
('Rainwater Harvesting Project', 'Installation of rainwater harvesting systems in 100 government buildings', 8500000, 'Water Resources', 'Green Solutions Pvt Ltd', 'Bangalore', 'Karnataka', 'verified', true, 'RTI Response'),
('School Building Renovation', 'Renovation of 25 government schools including toilets and classrooms', 35000000, 'Education Department', 'XYZ Infrastructure', 'Delhi', 'Delhi', 'disputed', false, 'News Report');
