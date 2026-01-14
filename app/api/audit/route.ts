import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Initialize Clients
// Note: We use the SERVICE_ROLE_KEY to ensure we can write to verification columns
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
// Using 'gemini-2.5-flash' for speed and cost-efficiency
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function POST(req: NextRequest) {
  try {
    const { report_id } = await req.json();

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    console.log(`🚀 Starting Audit for Report: ${report_id}`);

    // --- STEP 1: Fetch Report Data ---
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      console.error("Report lookup error:", reportError);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // CRITICAL: Check if image_url exists to prevent "toString of null" error
    if (!report.image_url) {
        console.error("❌ Error: Report has no image_url in the database.");
        return NextResponse.json({ error: 'Report is missing image_url. Please add an image to the report row.' }, { status: 400 });
    }

    console.log(`📸 Fetching image from: ${report.image_url}`);

    // --- STEP 2: Vision Analysis (Gemini) ---
    let imageBuffer: ArrayBuffer;
    try {
        const imageResponse = await fetch(report.image_url);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText} (${imageResponse.status})`);
        }
        imageBuffer = await imageResponse.arrayBuffer();
    } catch (err: any) {
        console.error("❌ Image Download Error:", err.message);
        return NextResponse.json({ error: `Failed to download image: ${err.message}` }, { status: 400 });
    }

    const visionPrompt = `
      You are an infrastructure auditor. Analyze this image and the GPS coordinates provided.
      GPS: ${report.latitude}, ${report.longitude}
      
      Return a valid JSON object with these fields:
      - "category": (String) e.g., 'road', 'bridge', 'building', 'drainage', 'electrical', 'water', 'other'. (Pick closest match)
      - "severity": (String) 'low', 'medium', 'high', 'critical'.
      - "is_authentic": (Boolean) Does this look like a real, natural photo taken by a citizen? 
      - "reasoning": (String) Why is it authentic or fake?
      - "description": (String) Technical description of the visual issue.
      - "confidence_score": (Number) 0.0 to 1.0.
    `;

    const visionResult = await model.generateContent([
      visionPrompt,
      {
        inlineData: {
          data: Buffer.from(imageBuffer).toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const visionText = visionResult.response.text().replace(/```json|```/g, '').trim();
    
    let visionData;
    try {
        visionData = JSON.parse(visionText);
    } catch (e) {
        console.error("JSON Parse Error (Vision):", visionText);
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // STOP if fake
    if (!visionData.is_authentic) {
      await supabase.from('reports').update({
        status: 'rejected', // Lowercase to match DB constraint
        is_authentic: false,
        fake_detection_reasoning: visionData.reasoning
      }).eq('id', report_id);
      return NextResponse.json({ status: 'rejected', reason: visionData.reasoning });
    }

    // --- STEP 3: Find Nearest Govt Project ---
    // Fetch all projects and filter (MVP Approach)
    const { data: projects } = await supabase.from('government_projects').select('*');
    
    let nearestProject = null;
    let minDist = Infinity;

    if (projects) {
      projects.forEach((p: any) => {
        // Simple Euclidean Distance
        const dist = Math.sqrt(
          Math.pow(p.latitude - report.latitude, 2) + 
          Math.pow(p.longitude - report.longitude, 2)
        );
        // Approx 0.005 degrees is ~500m
        if (dist < 0.005 && dist < minDist) {
          minDist = dist;
          nearestProject = p;
        }
      });
    }

    // --- STEP 4: Agentic Audit (Compare Evidence vs Record) ---
    let auditVerdict = { risk_level: 'Medium', audit_reasoning: 'Verified infrastructure issue, but no specific government project found nearby to compare against.' };

    if (nearestProject) {
      const today = new Date().toISOString().split('T')[0];
      
      const auditPrompt = `
        Compare User Evidence vs Official Record.
        
        TODAY: ${today}
        USER EVIDENCE: ${JSON.stringify(visionData)}
        OFFICIAL RECORD: ${JSON.stringify(nearestProject)}
        
        Logic:
        1. If Record='Completed' & Evidence='Damage', Risk=High.
        2. If Record='In Progress' & Evidence='Construction', Risk=Low.
        3. If Record='Delayed' & Evidence='No Work', Risk=High.
        
        Return JSON: { "risk_level": "Low"|"Medium"|"High", "audit_reasoning": "..." }
      `;

      const auditResult = await model.generateContent(auditPrompt);
      const auditText = auditResult.response.text().replace(/```json|```/g, '').trim();
      
      try {
        auditVerdict = JSON.parse(auditText);
      } catch (e) {
         console.error("JSON Parse Error (Audit):", auditText);
         // Keep default verdict if parsing fails
      }
    }

    // --- DATA NORMALIZATION FOR DB CONSTRAINTS ---
    
    // 1. Fix Severity (Must be lowercase: low, medium, high, critical)
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    let normalizedSeverity = (visionData.severity || 'medium').toLowerCase();
    if (!validSeverities.includes(normalizedSeverity)) normalizedSeverity = 'medium';

    // 2. Fix Category (Must be one of the allowed DB types)
    const validCategories = ['road', 'bridge', 'building', 'drainage', 'electrical', 'water', 'other'];
    let normalizedCategory = (visionData.category || 'other').toLowerCase();
    if (!validCategories.includes(normalizedCategory)) normalizedCategory = 'other';

    // 3. Fix Risk Level (Must be Capitalized: Low, Medium, High)
    const validRisks = ['Low', 'Medium', 'High'];
    let normalizedRisk = auditVerdict.risk_level || 'Medium';
    // Ensure first letter is uppercase, rest lowercase
    normalizedRisk = normalizedRisk.charAt(0).toUpperCase() + normalizedRisk.slice(1).toLowerCase();
    if (!validRisks.includes(normalizedRisk)) normalizedRisk = 'Medium';


    // --- STEP 5: Update Database ---
    const updatePayload = {
      ai_classification: visionData, 
      ai_confidence: visionData.confidence_score,
      severity: normalizedSeverity,     // FIXED: lowercase
      category: normalizedCategory,     // FIXED: lowercase valid category
      status: 'verified',               // FIXED: lowercase 'verified'
      is_authentic: true,
      fake_detection_reasoning: 'Passed AI checks',
      risk_level: normalizedRisk,       // FIXED: Capitalized
      audit_reasoning: auditVerdict.audit_reasoning,
      matched_project_id: nearestProject ? nearestProject.id : null
    };

    const { error: updateError } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('id', report_id);

    if (updateError) {
        console.error("DB Update Error:", updateError);
        throw updateError;
    }

    return NextResponse.json({ success: true, data: updatePayload });

  } catch (error: any) {
    console.error('Audit Error Details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}