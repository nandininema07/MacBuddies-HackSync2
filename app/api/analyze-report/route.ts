import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // --- STEP 1: GEOCODING (Nominatim for server-side) ---
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'IntegrityApp/1.0' } })
    const geoData = await geoRes.json()
    const detectedRoad = geoData.address?.road || geoData.address?.suburb || "Unknown Road"
    
    console.log(`2. User is likely at: ${detectedRoad}`)

    // --- STEP 2: CHECK GOVERNMENT RECORDS ---
    const { data: matchedProjects } = await supabase
      .from('government_projects')
      .select('*')
      .ilike('title', `%${detectedRoad}%`)
      .limit(1)

    const project = matchedProjects?.[0] || null
    console.log("3. Matched Govt Project:", project ? project.title : "None Found")

    // --- STEP 3: AI ANALYSIS ---
    let promptContext = project 
      ? `OFFICIAL RECORDS: Project "${project.title}", Contractor: ${project.contractor}, Status: ${project.status}, End Date: ${project.end_date}`
      : `NO OFFICIAL RECORDS found for this location.`

    const prompt = `
    You are an Infrastructure Auditor.
    ${promptContext}
    
    USER REPORT: "${userDescription}"
    
    Analyze the image. 
    Rules:
    1. Status 'Completed' + Potholes = "High Risk"
    2. Status 'In Progress' + Work Debris = "Compliant"
    3. 'Not Started' + Digging = "Suspicious"
    4. No Record + Bad Road = "Negligence"

    Return JSON:
    {
      "verdict": "High Risk" | "Compliant" | "Suspicious" | "Negligence",
      "reasoning": "Short explanation...",
      "severity": "low" | "medium" | "high"
    }
    `

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
        // Fallback if AI fails to return JSON
        aiData = { verdict: "Suspicious", reasoning: text, severity: "medium" }
    }

    // --- CRITICAL FIX: MAP VERDICT TO DB CONSTRAINT ---
    // Allowed DB Values: 'High', 'Medium', 'Low' (Case Sensitive)
    const riskMap: Record<string, string> = {
        "High Risk": "High",
        "Negligence": "High",
        "Critical": "High",
        "High": "High",
        
        "Suspicious": "Medium",
        "Medium": "Medium",
        "Pending Review": "Medium", // Fix for the crash you saw
        
        "Compliant": "Low",
        "Low Risk": "Low",
        "Low": "Low"
    };
    
    // Safety check: Default to 'Medium' if the key is missing
    const dbRiskLevel = riskMap[aiData.verdict] || "Medium";

    // --- STEP 4: SAVE TO DB ---
    const fileName = `${Date.now()}.jpg`
    await supabase.storage.from('evidence').upload(fileName, arrayBuffer, { contentType: imageFile.type })
    const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(fileName)

    const { data: insertData, error: insertError } = await supabase
        .from('reports')
        .insert({
            latitude: parseFloat(latitude.toString()),
            longitude: parseFloat(longitude.toString()),
            city: "Mumbai",
            title: userTitle || detectedRoad,
            description: userDescription,
            image_url: publicUrl,
            status: 'verified',
            category: 'road',
            
            // STRICTLY VALIDATED VALUES
            risk_level: dbRiskLevel, 
            severity: (aiData.severity || 'medium').toLowerCase(), 
            
            audit_reasoning: `Verdict: ${aiData.verdict}. ${aiData.reasoning}`, 
            matched_project_id: project ? project.id : null,
        })
        .select()

    if (insertError) {
        console.error("DB Insert Error:", insertError)
        throw insertError
    }

    return NextResponse.json({
        success: true,
        report_id: insertData[0].id,
        verdict: aiData,
        matched_project: project ? { title: project.title } : null
    })

  } catch (error: any) {
    console.error("Analysis Failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}