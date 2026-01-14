import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Fetch report details
    let reportData = null
    if (reportId) {
      const { data } = await supabase.from("reports").select("*").eq("id", reportId).single()
      reportData = data
    }

    const prompt = buildComplaintPrompt({
      report: reportData,
      department,
      applicantName,
      applicantAddress,
      applicantPhone,
      additionalDetails,
      language,
    })

    const { text } = await generateText({
      model: "google/gemini-2.0-flash-001",
      prompt,
      temperature: 0.3,
    })

    return NextResponse.json({
      success: true,
      generatedText: text,
      reportData,
    })
  } catch (error) {
    console.error("Complaint generation error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate complaint letter" }, { status: 500 })
  }
}

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
  const { report, department, applicantName, applicantAddress, applicantPhone, additionalDetails, language } = params

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
${report.estimated_cost ? `- Estimated Damage/Repair Cost: ₹${report.estimated_cost.toLocaleString("en-IN")}` : ""}
`
  }

  return `You are an expert at writing formal complaint letters to government authorities in India.

${langInstruction}

Generate a formal complaint letter based on the following:

COMPLAINANT:
- Name: ${applicantName}
- Address: ${applicantAddress}
- Phone: ${applicantPhone}

ADDRESSED TO: ${departmentNames[department] || department}

${issueDetails}

${additionalDetails ? `ADDITIONAL CONCERNS: ${additionalDetails}` : ""}

REQUIREMENTS:
1. Use formal government complaint letter format
2. Clearly state the problem and its impact on citizens
3. Request specific action with reasonable timeline
4. Mention that further escalation may be necessary if not addressed
5. Include reference to relevant government schemes/policies if applicable
6. Request acknowledgment and action taken report
7. Maintain firm but respectful tone

Generate a complete, professional complaint letter ready for submission.`
}
