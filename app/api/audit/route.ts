import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Initialize Clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role Key for backend updates
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
// Using 'gemini-1.5-flash' for speed and cost-efficiency
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(req: NextRequest) {
  try {
    const { report_id } = await req.json();

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    // --- STEP 1: Fetch Report Data ---
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // --- STEP 2: Analyze Image (Vision) ---
    // Fetch image data as arrayBuffer
    const imageResponse = await fetch(report.image_url);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Prepare prompt for Computer Vision & Authenticity
    const visionPrompt = `
      You are an infrastructure auditor. Analyze this image and the GPS coordinates provided.
      GPS: ${report.latitude}, ${report.longitude}
      
      Return a valid JSON object with these fields:
      - "category": (String) e.g., 'Pothole', 'Garbage', 'Broken Light', 'Construction'.
      - "severity": (String) 'Low', 'Medium', 'Critical'.
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
          mimeType: 'image/jpeg', // Assuming JPEG, adjust if needed
        },
      },
    ]);

    const visionText = visionResult.response.text().replace(/```json|```/g, '').trim();
    const visionData = JSON.parse(visionText);

    // STOP if fake
    if (!visionData.is_authentic) {
      await supabase.from('reports').update({
        status: 'Rejected',
        is_authentic: false,
        fake_detection_reasoning: visionData.reasoning
      }).eq('id', report_id);

      return NextResponse.json({ status: 'rejected', reason: visionData.reasoning });
    }

    // --- STEP 3: Find Nearest Govt Project (Retrieval) ---
    // Using a simplified distance calculation for MVP (fetch all & filter).
    // In production, use Supabase .rpc() with PostGIS.
    const { data: projects } = await supabase.from('government_projects').select('*');
    
    let nearestProject = null;
    let minDist = Infinity;

    if (projects) {
      projects.forEach((p: any) => {
        // Simple Euclidean distance approximation
        const dist = Math.sqrt(
          Math.pow(p.latitude - report.latitude, 2) + 
          Math.pow(p.longitude - report.longitude, 2)
        );
        // Approx 0.005 degrees is roughly 500m
        if (dist < 0.005 && dist < minDist) {
          minDist = dist;
          nearestProject = p;
        }
      });
    }

    // --- STEP 4: Agentic Audit (Compare Evidence vs Record) ---
    let auditVerdict = { risk_level: 'Medium', audit_reasoning: 'No matching government project found.' };

    if (nearestProject) {
      const auditPrompt = `
        Compare User Evidence vs Official Record.
        
        Evidence: ${JSON.stringify(visionData)}
        Record: ${JSON.stringify(nearestProject)}
        
        Rules:
        1. If Record status is 'Completed' but Evidence shows 'Damage', Risk = High.
        2. If Record status is 'In Progress' and Evidence shows 'Construction', Risk = Low.
        3. If Record status is 'Delayed' and Evidence shows 'No Work', Risk = High.
        
        Return JSON: { "risk_level": "Low"|"Medium"|"High", "audit_reasoning": "..." }
      `;

      const auditResult = await model.generateContent(auditPrompt);
      const auditText = auditResult.response.text().replace(/```json|```/g, '').trim();
      auditVerdict = JSON.parse(auditText);
    }

    // --- STEP 5: Update Database ---
    const updatePayload = {
      ai_classification: visionData, // Stores full JSON in jsonb column
      ai_confidence: visionData.confidence_score,
      severity: visionData.severity,
      status: 'Verified',
      is_authentic: true,
      fake_detection_reasoning: 'Passed AI checks',
      risk_level: auditVerdict.risk_level,
      audit_reasoning: auditVerdict.audit_reasoning,
      matched_project_id: nearestProject ? nearestProject.id : null
    };

    await supabase.from('reports').update(updatePayload).eq('id', report_id);

    return NextResponse.json({ success: true, data: updatePayload });

  } catch (error: any) {
    console.error('Audit Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}