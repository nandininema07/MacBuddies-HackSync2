import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// The specific endpoint for detailed Phase 1 & 2 data
const MCGM_API_URL = 'https://roads.mcgm.gov.in:3000/api/publicdashboardlocation/getallroadsdetailscrustphase1phase2wardwisestatuswise'

const MUMBAI_WARDS = [
  "A", "B", "C", "D", "E", "F/N", "F/S", "G/N", "G/S", 
  "H/E", "H/W", "K/E", "K/W", "L", "M/E", "M/W", "N", 
  "P/N", "P/S", "R/C", "R/N", "R/S", "S", "T"
]

// Allow this route to run for up to 60 seconds (Vercel Limit)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Initialize Supabase inside the handler
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Optional: Allow syncing specific ward via body to prevent timeouts
    const body = await request.json().catch(() => ({}))
    const wardsToSync = body.ward ? [body.ward] : MUMBAI_WARDS

    let totalSynced = 0
    console.log(`Starting Sync for ${wardsToSync.length} wards...`)

    for (const ward of wardsToSync) {
      try {
        console.log(`Fetching Ward ${ward}...`)
        
        // 2. Standard Fetch (No custom SSL Agent for Vercel compatibility)
        const response = await fetch(MCGM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({ 
                wardName: ward, 
                progressStatus: ["Completed", "In Progress", "Not Started"] 
            })
        })

        if (!response.ok) {
            console.error(`API Error Ward ${ward}: ${response.status}`)
            continue
        }

        const json = await response.json()
        const roads = json.data || []

        if (roads.length === 0) {
            console.log(`No roads found for Ward ${ward}`)
            continue
        }

        // 3. Map Data
        const wardProjects = roads.map((item: any) => ({
          external_id: item._id,
          title: item.locationName || "Unknown Road Work",
          ward: item.wardName,
          zone: item.zoneName,
          
          contractor: item.contractorName,
          status: item.status,
          work_type: item.roadType,
          
          progress_percent: parseFloat(item.pqcPercentProgress || '0'),
          length: parseFloat(item.length || '0'),
          
          start_date: item.startDate || null,
          end_date: item.endDate || null,
          
          department: 'Roads & Traffic',
          city: 'Mumbai',
          updated_at: new Date().toISOString()
        }))

        // 4. Upsert to Supabase
        const { error } = await supabase
          .from('government_projects')
          .upsert(wardProjects, { onConflict: 'external_id' })

        if (error) {
            console.error(`DB Error Ward ${ward}:`, error.message)
        } else {
            totalSynced += wardProjects.length
            console.log(`Synced ${wardProjects.length} projects for Ward ${ward}`)
        }

      } catch (err) {
        console.error(`Failed to process Ward ${ward}:`, err)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync Complete. Updated ${totalSynced} projects.`
    })

  } catch (error: any) {
    console.error("Global Sync Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}