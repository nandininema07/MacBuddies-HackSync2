import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'ward_data')
    
    // Check if folder exists
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ error: "Folder 'ward_data' not found in project root." }, { status: 404 })
    }

    // Get all JSON files
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'))
    
    if (files.length === 0) {
      return NextResponse.json({ message: "No JSON files found in 'ward_data'" })
    }

    let totalInserted = 0
    const results = []

    console.log(`Found ${files.length} ward files. Starting import...`)

    // Loop through each file
    for (const file of files) {
      try {
        const filePath = path.join(dataDir, file)
        const fileContent = fs.readFileSync(filePath, 'utf8')
        const json = JSON.parse(fileContent)

        // Handle the specific API response structure: { status: 200, data: [...] }
        const rawProjects = Array.isArray(json) ? json : (json.data || [])

        if (rawProjects.length === 0) {
          console.log(`File ${file} is empty or invalid format. Skipping.`)
          continue
        }

        // Map fields to your Database Schema
        const cleanData = rawProjects.map((item: any) => ({
          external_id: item._id,
          title: item.locationName,
          ward: item.wardName,
          zone: item.zoneName,
          work_code: item.workCode,
          contractor: item.contractorName,
          status: item.status,
          work_type: item.roadType,
          
          // Safe Number Parsing
          progress_percent: parseFloat(item.progressPercent || '0'),
          length: parseFloat(item.length || '0'),
          
          // Safe Date Parsing
          start_date: item.startDate ? new Date(item.startDate).toISOString() : null,
          end_date: item.endDate ? new Date(item.endDate).toISOString() : null,
          
          department: 'Roads & Traffic',
          city: 'Mumbai',
          updated_at: new Date().toISOString()
        }))

        // Upsert to Supabase
        const { error } = await supabase
          .from('government_projects')
          .upsert(cleanData, { onConflict: 'external_id' })

        if (error) {
          console.error(`Error importing ${file}:`, error.message)
          results.push({ file, status: 'Failed', error: error.message })
        } else {
          console.log(`Success: Imported ${cleanData.length} projects from ${file}`)
          totalInserted += cleanData.length
          results.push({ file, status: 'Success', count: cleanData.length })
        }

      } catch (err: any) {
        console.error(`Fatal error processing ${file}:`, err)
        results.push({ file, status: 'Error', error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      total_projects_added: totalInserted,
      details: results
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}