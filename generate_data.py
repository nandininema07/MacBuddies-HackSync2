import pandas as pd
import uuid
import random
from datetime import datetime, timedelta

# Configuration
NUM_ROWS = 1000

# Major Indian Cities with their Central Lat/Lon
CITIES = {
    'Mumbai': (19.0760, 72.8777),
    'Delhi': (28.7041, 77.1025),
    'Bangalore': (12.9716, 77.5946),
    'Hyderabad': (17.3850, 78.4867),
    'Chennai': (13.0827, 80.2707),
    'Kolkata': (22.5726, 88.3639),
    'Pune': (18.5204, 73.8567),
    'Ahmedabad': (23.0225, 72.5714),
    'Jaipur': (26.9124, 75.7873),
    'Lucknow': (26.8467, 80.9462),
    'Bhopal': (23.2599, 77.4126),
    'Indore': (22.7196, 75.8577),
    'Chandigarh': (30.7333, 76.7794)
}

PROJECT_TYPES = ['roads', 'bridge', 'sanitation', 'public_works', 'electrical', 'water', 'drainage']

CONTRACTORS = [
    'L&T Construction', 'Tata Projects', 'Hindustan Construction Co', 'Dilip Buildcon', 
    'Afcons Infrastructure', 'NCC Ltd', 'IRB Infrastructure', 'GMR Group', 
    'Shapoorji Pallonji', 'Reliance Infrastructure', 'Local PWD Contractor', 
    'State Infrastructure Corp', 'City Municipal Corporation'
]

STATUSES = ['Ongoing', 'Completed', 'Delayed', 'Near Completion']

def generate_project_name(city, p_type):
    prefixes = ['Rehabilitation of', 'Construction of', 'Maintenance of', 'Upgrading', 'Expansion of']
    if p_type == 'roads':
        return f"{random.choice(prefixes)} {city} Main Road {random.randint(1, 100)}"
    elif p_type == 'bridge':
        return f"{random.choice(prefixes)} Flyover at {city} Junction {random.choice(['A', 'B', 'C'])}"
    elif p_type == 'sanitation':
        return f"{city} Waste Management & Sanitation Project Phase {random.randint(1, 4)}"
    elif p_type == 'public_works':
        return f"Renovation of {city} Public Complex Sector {random.randint(1, 20)}"
    elif p_type == 'electrical':
        return f"Underground Cabling & Grid Modernization in {city}"
    elif p_type == 'water':
        return f"Water Pipeline Laying for {city} Ward {random.randint(10, 50)}"
    elif p_type == 'drainage':
        return f"Storm Water Drain Construction in {city} Zone {random.randint(1, 5)}"
    return f"{city} Infrastructure Development Project"

data = []

print("Generating 1000 realistic Indian projects...")

for _ in range(NUM_ROWS):
    city_name, (lat, lon) = random.choice(list(CITIES.items()))
    
    # Randomize location within ~5-6km radius of city center
    # 0.01 degrees is approx 1.1km
    rand_lat = lat + random.uniform(-0.05, 0.05)
    rand_lon = lon + random.uniform(-0.05, 0.05)
    
    p_type = random.choice(PROJECT_TYPES)
    p_name = generate_project_name(city_name, p_type)
    
    # Budget between 10 Lakhs and 500 Crores
    budget = random.randint(1000000, 5000000000)
    
    # Dates
    start_date = datetime.now() - timedelta(days=random.randint(100, 1000))
    expected_end = start_date + timedelta(days=random.randint(200, 700))
    
    current_status = random.choices(STATUSES, weights=[0.4, 0.3, 0.2, 0.1])[0]
    
    row = {
        'project_id': str(uuid.uuid4()),
        'project_name': p_name,
        'budget': budget,
        'contractor_name': random.choice(CONTRACTORS),
        'location_latitude': round(rand_lat, 6),
        'location_longitude': round(rand_lon, 6),
        'project_type': p_type,
        'expected_completion_date': expected_end.strftime('%Y-%m-%d'),
        'current_status': current_status,
        'is_verified': 'True'
    }
    data.append(row)

df = pd.DataFrame(data)
# Save as 'Gov_project.csv' so it works with your existing seed.ts
df.to_csv('Gov_project.csv', index=False)
print("✅ Done! Saved to Gov_project.csv")