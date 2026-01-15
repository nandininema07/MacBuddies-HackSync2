import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Gemini AI (Using the corrected Env Var)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const latitude = formData.get('latitude')
    const longitude = formData.get('longitude')
    const userDescription = formData.get('description') as string
    const userTitle = formData.get('title') as string

    if (!imageFile || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing image or location data" }, { status: 400 })
    }

    console.log("1. Starting Analysis for:", latitude, longitude)

    // --- STEP 1: REVERSE GEOCODING ---
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'IntegrityApp/1.0' } })
    const geoData = await geoRes.json()
    
    const detectedRoad = geoData.address.road || geoData.address.pedestrian || geoData.address.suburb || "Unknown Road"
    
    console.log(`2. User is likely at: ${detectedRoad}`)

    // --- STEP 2: FUZZY MATCH GOVT PROJECT ---
    const { data: matchedProjects } = await supabase
      .from('government_projects')
      .select('*')
      .ilike('title', `%${detectedRoad}%`)
      .limit(1)

    const project = matchedProjects && matchedProjects.length > 0 ? matchedProjects[0] : null
    
    console.log("3. Matched Govt Project:", project ? project.title : "None Found")

    // --- STEP 3: PREPARE AI PROMPT ---
    let promptContext = ""
    if (project) {
        promptContext = `
        OFFICIAL GOVERNMENT RECORDS found for this location:
        - Project: ${project.title}
        - Contractor: ${project.contractor}
        - Status: ${project.status}
        - Dates: ${project.start_date} to ${project.end_date}
        `
    } else {
        promptContext = `NO OFFICIAL MAINTENANCE RECORDS found for this location (${detectedRoad}).`
    }

    const prompt = `
    You are an Infrastructure Auditor.
    ${promptContext}
    
    USER REPORT: "${userDescription}"
    
    Analyze the image. 
    Rules:
    1. Status 'Completed' + Potholes = "High Risk" (Corruption/Quality issue).
    2. Status 'In Progress' + Work Debris = "Compliant".
    3. 'Not Started' + Digging = "Suspicious".
    4. No Record + Bad Road = "Negligence".

    Return JSON:
    {
      "verdict": "High Risk" | "Compliant" | "Suspicious" | "Negligence",
      "reasoning": "Short explanation...",
      "severity": "low" | "medium" | "high" | "critical"
    }
    `

    // --- STEP 4: RUN GEMINI AI ---
    const arrayBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')
    
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: imageFile.type } }
    ])
    
    const text = result.response.text()
    const cleanJson = text.replace(/```json|```/g, '').trim()
    let aiData;
    
    try {
        aiData = JSON.parse(cleanJson)
    } catch (e) {
        // Fallback if AI returns plain text
        aiData = { verdict: "Pending Review", reasoning: text, severity: "medium" }
    }

    // --- STEP 5: SAVE TO DB (FIXED) ---
    
    // 1. Upload Image
    const fileName = `${Date.now()}.jpg`
    await supabase.storage.from('evidence').upload(fileName, arrayBuffer, { contentType: imageFile.type })
    const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(fileName)

    // 2. Insert Report (Now includes 'severity')
    const { data: insertData, error: insertError } = await supabase
        .from('reports')
        .insert({
            latitude: parseFloat(latitude.toString()),
            longitude: parseFloat(longitude.toString()),
            city: "Mumbai",
            title: userTitle || detectedRoad, // Use user title or detected road
            description: userDescription,
            image_url: publicUrl,
            status: 'verified',
            category: 'road', // Defaulting to road since this is a road audit app
            
            // --- FIX IS HERE ---
            risk_level: aiData.verdict, // Maps to 'High Risk', etc.
            severity: aiData.severity || 'medium', // SATISFIES NOT-NULL CONSTRAINT
            audit_reasoning: aiData.reasoning,
            matched_project_id: project ? project.id : null,
        })
        .select()

    if (insertError) {
        console.error("DB Insert Error:", insertError)
        throw insertError
    }

    return NextResponse.json({
        success: true,
        verdict: aiData,
        matched_project: project ? { title: project.title } : null
    })

  } catch (error: any) {
    console.error("Analysis Failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}