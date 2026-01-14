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
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // --- STEP 2: Vision Analysis (Gemini) ---
    // We assume report.image_url is a public URL. 
    // If it's private, we'd need to download it via Supabase Storage API first.
    const imageResponse = await fetch(report.image_url);
    const imageBuffer = await imageResponse.arrayBuffer();
    
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
          mimeType: 'image/jpeg',
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

    // --- STEP 3: Find Nearest Govt Project ---
    // Fetch all projects and filter in JS (Simple MVP approach)
    // Production Upgrade: Use Supabase .rpc() for PostGIS 'ST_DWithin'
    const { data: projects } = await supabase.from('government_projects').select('*');
    
    let nearestProject = null;
    let minDist = Infinity;

    if (projects) {
      projects.forEach((p: any) => {
        // Simple distance (Euclidean). 0.001 degrees is roughly 100m.
        const dist = Math.sqrt(
          Math.pow(p.latitude - report.latitude, 2) + 
          Math.pow(p.longitude - report.longitude, 2)
        );
        // Look for projects within ~500m (0.005 degrees)
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
        
        TODAY'S DATE: ${today}
        
        USER EVIDENCE:
        - Issue: ${visionData.category}
        - Severity: ${visionData.severity}
        - Description: ${visionData.description}
        
        OFFICIAL RECORD:
        - Project: ${nearestProject.name}
        - Type: ${nearestProject.project_type}
        - Budget: ${nearestProject.budget}
        - Expected Completion: ${nearestProject.expected_completion}
        - Status in DB: ${nearestProject.status} (Note: 'verified' means valid record, not necessarily completed work)
        
        AUDIT LOGIC:
        1. TIMELINE CHECK: If Today > Expected Completion AND evidence shows "Incomplete/Damage", Risk is HIGH.
        2. STATUS CHECK: If project should be active (dates valid) and evidence shows "Construction work", Risk is LOW (Compliance).
        3. BUDGET CHECK: If budget is high but evidence shows "Severe Potholes/Damage", Risk is HIGH.
        
        Return JSON: { "risk_level": "Low"|"Medium"|"High", "audit_reasoning": "..." }
      `;

      const auditResult = await model.generateContent(auditPrompt);
      const auditText = auditResult.response.text().replace(/```json|```/g, '').trim();
      auditVerdict = JSON.parse(auditText);
    }

    // --- STEP 5: Update Database ---
    const updatePayload = {
      ai_classification: visionData, 
      ai_confidence: visionData.confidence_score,
      severity: visionData.severity,
      status: 'Verified',
      is_authentic: true,
      fake_detection_reasoning: 'Passed AI checks',
      risk_level: auditVerdict.risk_level,
      audit_reasoning: auditVerdict.audit_reasoning,
      matched_project_id: nearestProject ? nearestProject.id : null
    };

    const { error: updateError } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('id', report_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updatePayload });

  } catch (error: any) {
    console.error('Audit Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}