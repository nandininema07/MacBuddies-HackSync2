import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { createClient } from "@/lib/supabase/server"

/* ------------------------------------------------------------------ */
/* Gemini Client                                                       */
/* ------------------------------------------------------------------ */

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

/* ------------------------------------------------------------------ */
/* POST Handler                                                        */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      reportId,
      department,
      applicantName,
      applicantAddress,
      applicantPhone,
      additionalDetails,
      language = "en",
    } = body

    const supabase = await createClient()

    /* ---------------- Fetch report ---------------- */
    let reportData: any = null
    if (reportId) {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single()
      reportData = data
    }

    /* ---------------- Build prompt ---------------- */
    const prompt = buildComplaintPrompt({
      report: reportData,
      department,
      applicantName,
      applicantAddress,
      applicantPhone,
      additionalDetails,
      language,
    })

    /* ---------------- Gemini call ---------------- */
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    })

    const generatedText =
      response.candidates?.[0]?.content?.parts?.[0]?.text || ""

    return NextResponse.json({
      success: true,
      generatedText,
      reportData,
    })
  } catch (error) {
    console.error("Complaint generation error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate complaint letter" },
      { status: 500 }
    )
  }
}

/* ------------------------------------------------------------------ */
/* Prompt Builder                                                      */
/* ------------------------------------------------------------------ */

interface ComplaintPromptParams {
  report: any
  department: string
  applicantName: string
  applicantAddress: string
  applicantPhone: string
  additionalDetails?: string
  language: string
}

function buildComplaintPrompt(params: ComplaintPromptParams): string {
  const {
    report,
    department,
    applicantName,
    applicantAddress,
    applicantPhone,
    additionalDetails,
    language,
  } = params

  const langInstruction =
    language === "hi"
      ? "Generate the complaint letter in Hindi (Devanagari script)."
      : "Generate the complaint letter in formal English."

  const departmentNames: Record<string, string> = {
    pwd: "Executive Engineer, Public Works Department",
    municipal: "Municipal Commissioner",
    water: "Chief Engineer, Water Supply Department",
    electrical: "Superintending Engineer, Electricity Board",
    general: "Concerned Authority",
  }

  let issueDetails = ""
  if (report) {
    issueDetails = `
ISSUE DETAILS:
- Type: ${report.category?.toUpperCase() || "Infrastructure Issue"}
- Location: ${report.address || `Coordinates: ${report.latitude}, ${report.longitude}`}
- City: ${report.city || "Unknown"}
- Severity: ${report.severity?.toUpperCase() || "Significant"}
- Description: ${report.description || "Infrastructure defect requiring immediate attention"}
- First Reported: ${new Date(report.created_at).toLocaleDateString("en-IN")}
${report.ai_classification ? `- Technical Issues: ${report.ai_classification.issues_detected?.join(", ")}` : ""}
${report.estimated_cost ? `- Estimated Repair Cost: ₹${report.estimated_cost.toLocaleString("en-IN")}` : ""}
`
  }

  return `
You are an expert at drafting formal complaint letters addressed to government authorities in India.

${langInstruction}

COMPLAINANT DETAILS:
Name: ${applicantName}
Address: ${applicantAddress}
Phone: ${applicantPhone}

ADDRESSED TO:
${departmentNames[department] || department}

${issueDetails}

${additionalDetails ? `ADDITIONAL CONCERNS:\n${additionalDetails}` : ""}

REQUIREMENTS:
1. Follow formal government complaint letter format
2. Clearly explain the issue and public impact
3. Request specific corrective action with reasonable timeline
4. Mention escalation if the issue remains unresolved
5. Request acknowledgment and action taken report
6. Maintain firm, respectful, and professional tone
7. no bold text 
Generate a complete, ready-to-submit complaint letter.
`
}
