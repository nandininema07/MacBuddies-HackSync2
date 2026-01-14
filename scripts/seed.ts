import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env');
  process.exit(1);
}

// Disable auth persistence for script
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function seedDatabase() {
  const results: any[] = [];
  const filePath = path.join(process.cwd(), 'Gov_project.csv');

  console.log('📂 Reading Gov_project.csv...');

  if (!fs.existsSync(filePath)) {
    console.error('❌ Gov_project.csv not found!');
    process.exit(1);
  }

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // Helper to handle empty strings as NULL
      const toNull = (val: string) => (val && val.trim() !== '' ? val : null);
      
      results.push({
        // 1. Primary Key
        id: row.id, 

        // 2. Core Fields
        name: row.name,
        description: row.description,
        status: row.status, // Values are already 'verified'/'pending' etc in your CSV
        project_type: row.project_type,
        department: row.department,
        contractor_name: row.contractor_name,

        // 3. Location (CSV now has 'latitude' not 'location_latitude')
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        city: row.city,
        state: row.state,

        // 4. Verification Data
        is_verified: row.is_verified === 'True' || row.is_verified === 'true',
        verification_source: toNull(row.verification_source),
        verification_notes: toNull(row.verification_notes),

        // 5. Numeric / Scores
        budget: row.budget ? parseFloat(row.budget) : 0,
        community_votes_up: row.community_votes_up ? parseInt(row.community_votes_up) : 0,
        community_votes_down: row.community_votes_down ? parseInt(row.community_votes_down) : 0,
        contractor_risk_score: row.contractor_risk_score ? parseInt(row.contractor_risk_score) : 0,

        // 6. Dates (Handle empty strings)
        start_date: toNull(row.start_date),
        expected_completion: toNull(row.expected_completion),
        actual_completion: toNull(row.actual_completion),
        completion_date: toNull(row.completion_date),
        created_at: toNull(row.created_at) || new Date().toISOString(),
        updated_at: toNull(row.updated_at) || new Date().toISOString(),

        // 7. Foreign Keys (Handle empty as null)
        submitted_by: toNull(row.submitted_by) 
      });
    })
    .on('end', async () => {
      console.log(`📊 Parsed ${results.length} rows. Uploading...`);

      // Upload in batches
      const batchSize = 100;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        
        // Upsert based on 'id'
        const { error } = await supabase.from('government_projects').upsert(batch);

        if (error) {
          console.error(`❌ Batch ${i/batchSize + 1} Error:`, error.message);
        } else {
          console.log(`✅ Seeded batch ${i/batchSize + 1}`);
        }
      }
      console.log('🎉 Migration Complete!');
    });
}

seedDatabase();