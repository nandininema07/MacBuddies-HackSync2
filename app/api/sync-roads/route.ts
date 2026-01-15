import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import https from 'https'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// The specific endpoint for detailed Phase 1 & 2 data
const MCGM_API_URL = 'https://roads.mcgm.gov.in:3000/api/publicdashboardlocation/getallroadsdetailscrustphase1phase2wardwisestatuswise'

const MUMBAI_WARDS = [
  "A", "B", "C", "D", "E", "F/N", "F/S", "G/N", "G/S", 
  "H/E", "H/W", "K/E", "K/W", "L", "M/E", "M/W", "N", 
  "P/N", "P/S", "R/C", "R/N", "R/S", "S", "T"
]

// Ignore SSL errors from the government server
const sslAgent = new https.Agent({ rejectUnauthorized: false });

export async function GET(request: Request) {
  try {
    let totalSynced = 0
    
    console.log("Starting Precise Mumbai Infrastructure Sync...")

    for (const ward of MUMBAI_WARDS) {
      try {
        const payload = { 
            wardName: ward, // Matches the API requirement
            status: "Total" 
        }

        const response = await fetch(MCGM_API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          },
          body: JSON.stringify(payload),
          // @ts-ignore
          agent: sslAgent,
          next: { revalidate: 0 }
        })

        if (!response.ok) {
          console.error(`Ward ${ward} Error: ${response.status}`)
          continue
        }

        const json = await response.json()
        const rawData = json.data || []

        if (rawData.length === 0) continue;

        // Map the exact fields from your provided JSON
        const wardProjects = rawData.map((item: any) => ({
          external_id: item._id,                // e.g. "6967fcd0..."
          title: item.locationName,             // e.g. "V. N. Road..."
          ward: item.wardName,                  // e.g. "A"
          zone: item.zoneName,                  // e.g. "Zone - I City"
          work_code: item.workCode,             // e.g. "C-322"
          contractor: item.contractorName,      // e.g. "M/s N.C.C Ltd"
          status: item.status,                  // e.g. "Not Started"
          work_type: item.roadType,             // e.g. "Mega CC Phase 2"
          
          // Number Parsing
          progress_percent: parseFloat(item.progressPercent || '0'),
          length: parseFloat(item.length || '0'),
          
          // Date Parsing (Direct ISO strings from API)
          start_date: item.startDate || null,
          end_date: item.endDate || null,
          
          department: 'Roads & Traffic',
          city: 'Mumbai',
          updated_at: new Date().toISOString()
        }))

        // Upsert this ward's data
        const { error } = await supabase
          .from('government_projects')
          .upsert(wardProjects, { onConflict: 'external_id' })

        if (error) {
            console.error(`DB Error Ward ${ward}:`, error.message)
        } else {
            totalSynced += wardProjects.length
            console.log(`Synced ${wardProjects.length} projects for Ward ${ward}`)
        }

        // Tiny delay to respect the server
        await new Promise(r => setTimeout(r, 100))

      } catch (err) {
        console.error(`Failed to process Ward ${ward}:`, err)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync Complete. Updated ${totalSynced} projects.`,
      count: totalSynced
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}