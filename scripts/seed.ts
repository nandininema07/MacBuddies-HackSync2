import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 1. Load Environment Variables
dotenv.config(); // This loads variables from your .env file

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // REQUIRED: Use Service Role Key to bypass RLS

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env file.');
  console.error('   Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// 2. Initialize Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// --- HELPER: Normalize Status ---
// Maps your CSV status to the allowed DB constraints: 'pending', 'verified', 'disputed', 'rejected'
function normalizeStatus(csvStatus: string): string {
  const statusMap: Record<string, string> = {
    'Ongoing': 'verified',          // Active official projects are "verified"
    'Near Completion': 'verified',  
    'Completed': 'verified',        // Completed official projects are "verified"
    'Delayed': 'disputed',          // Delayed projects are flagged as "disputed"
    'In Progress': 'verified',
    'Pending': 'pending'
  };

  // Default to 'pending' if the CSV status is unknown
  return statusMap[csvStatus] || 'pending';
}

// --- HELPER: Generate Start Date ---
// Creates a realistic start date 1-3 years prior to the expected completion
function generateStartDate(endDateStr: string): string | null {
  try {
    const endDate = new Date(endDateStr);
    if (isNaN(endDate.getTime())) return null; // Invalid date check
    
    const daysPrior = Math.floor(Math.random() * (1095 - 365 + 1)) + 365; // 1 to 3 years
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysPrior);
    return startDate.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// --- HELPER: Map Department ---
// Assigns a department based on the project type
function mapDepartment(type: string): string {
  const mapping: Record<string, string> = {
    roads: 'Ministry of Road Transport & Highways',
    sanitation: 'Department of Water & Sanitation',
    public_works: 'Public Works Department (CPWD)',
    bridge: 'State Infrastructure Development Corp',
    electrical: 'Department of Power & Energy'
  };
  return mapping[type] || 'General Infrastructure Dept';
}

async function seedDatabase() {
  const results: any[] = [];
  const filePath = path.join(process.cwd(), 'Gov_project.csv');

  console.log(`📂 Reading CSV from: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error('❌ Error: Gov_project.csv not found in the root directory.');
    process.exit(1);
  }

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // Data Transformation
      const dbStatus = normalizeStatus(row.current_status);
      const projectType = row.project_type;
      const expectedDate = row.expected_completion_date;

      results.push({
        id: row.project_id,
        name: row.project_name,
        budget: parseFloat(row.budget) || 0,
        contractor_name: row.contractor_name,
        latitude: parseFloat(row.location_latitude) || 0,
        longitude: parseFloat(row.location_longitude) || 0,
        
        // --- Schema Mapped Fields ---
        status: dbStatus, // Mapped to allow 'verified'/'disputed'/'pending'
        project_type: projectType,
        is_verified: row.is_verified?.toLowerCase() === 'true',
        expected_completion: expectedDate,
        
        // --- Generated Realistic Data ---
        start_date: generateStartDate(expectedDate),
        department: mapDepartment(projectType),
        description: `Official government project for ${projectType} infrastructure. ${row.project_name}. Allocated budget of INR ${row.budget}.`,
        city: 'Unknown',
        state: 'India',
        
        // --- Setting Defaults for Other Schema Columns ---
        community_votes_up: 0,
        community_votes_down: 0,
        contractor_risk_score: 0
      });
    })
    .on('end', async () => {
      console.log(`📊 Parsed ${results.length} rows. Uploading to Supabase...`);

      // Upload in batches of 100 to prevent timeouts
      const batchSize = 100;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        
        // We use 'upsert' so if you run this script twice, it just updates existing rows instead of failing
        const { error } = await supabase.from('government_projects').upsert(batch, { onConflict: 'id' });

        if (error) {
          console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        } else {
          console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}`);
        }
      }
      console.log('🎉 Migration Complete!');
    });
}

// Execute the seed function
seedDatabase();