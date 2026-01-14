import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      reportId,
      projectId,
      department,
      templateType,
      applicantName,
      applicantAddress,
      applicantPhone,
      customRequests,
      language = "en",
    } = body

    const supabase = await createClient()

    // Fetch report details if provided
    let reportData = null
    if (reportId) {
      const { data } = await supabase.from("reports").select("*").eq("id", reportId).single()
      reportData = data
    }

    // Fetch project details if provided
    let projectData = null
    if (projectId) {
      const { data } = await supabase.from("government_projects").select("*").eq("id", projectId).single()
      projectData = data
    }

    // Build the prompt for Gemini
    const prompt = buildRTIPrompt({
      report: reportData,
      project: projectData,
      department,
      templateType,
      applicantName,
      applicantAddress,
      applicantPhone,
      customRequests,
      language,
    })

    // Generate RTI using Gemini via Vercel AI Gateway
    const { text } = await generateText({
      model: "google/gemini-2.0-flash-001",
      prompt,
      temperature: 0.3, // Lower temperature for formal documents
    })

    return NextResponse.json({
      success: true,
      generatedText: text,
      reportData,
      projectData,
    })
  } catch (error) {
    console.error("RTI generation error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate RTI application" }, { status: 500 })
  }
}

interface RTIPromptParams {
  report: any
  project: any
  department: string
  templateType: string
  applicantName: string
  applicantAddress: string
  applicantPhone: string
  customRequests?: string[]
  language: string
}

function buildRTIPrompt(params: RTIPromptParams): string {
  const {
    report,
    project,
    department,
    templateType,
    applicantName,
    applicantAddress,
    applicantPhone,
    customRequests,
    language,
  } = params

  const departmentNames: Record<string, string> = {
    pwd: "Public Works Department",
    municipal: "Municipal Corporation",
    water: "Water Supply & Sanitation Department",
    electrical: "State Electricity Board",
    general: "Concerned Government Department",
  }

  const langInstruction =
    language === "hi"
      ? "Generate the RTI application in Hindi (Devanagari script)."
      : "Generate the RTI application in formal English."

  let contextSection = ""

  if (report) {
    contextSection += `
INFRASTRUCTURE ISSUE REPORTED:
- Type: ${report.category?.toUpperCase() || "Infrastructure Issue"}
- Location: ${report.address || `Lat: ${report.latitude}, Long: ${report.longitude}`}
- City/State: ${report.city || "Unknown"}, ${report.state || "Unknown"}
- Severity: ${report.severity?.toUpperCase() || "Unknown"}
- Description: ${report.description || "Infrastructure defect observed"}
- Date Reported: ${new Date(report.created_at).toLocaleDateString("en-IN")}
- Current Status: ${report.status?.toUpperCase() || "Pending"}
${report.ai_classification ? `- AI Analysis: Issues detected - ${report.ai_classification.issues_detected?.join(", ") || "Quality concerns identified"}` : ""}
${report.estimated_cost ? `- Estimated Repair Cost: ₹${report.estimated_cost.toLocaleString("en-IN")}` : ""}
`
  }

  if (project) {
    contextSection += `
RELATED GOVERNMENT PROJECT:
- Project Name: ${project.name}
- Budget: ₹${project.budget?.toLocaleString("en-IN") || "Not disclosed"}
- Department: ${project.department || "Not specified"}
- Contractor: ${project.contractor_name || "Not disclosed"}
- Expected Completion: ${project.expected_completion ? new Date(project.expected_completion).toLocaleDateString("en-IN") : "Not specified"}
- Current Status: ${project.status?.toUpperCase() || "Unknown"}
- Location: ${project.city || "Unknown"}, ${project.state || "Unknown"}
`
  }

  const defaultInformationRequests = `
1. Certified copies of project approval documents and administrative sanction orders
2. Complete budget allocation details including fund source and expenditure breakdown
3. Contractor selection process documentation including tender notices, bid comparisons, and award criteria
4. Quality inspection reports and material testing certificates
5. Current project completion status with photographic evidence
6. Details of supervising officers responsible for quality monitoring
7. Any complaints received regarding this project and action taken
`

  const customRequestsText = customRequests?.length ? customRequests.map((r, i) => `${i + 8}. ${r}`).join("\n") : ""

  return `You are an expert legal assistant specializing in Right to Information (RTI) applications under the RTI Act, 2005 of India.

${langInstruction}

Generate a formal, legally appropriate RTI application based on the following details:

APPLICANT DETAILS:
- Name: ${applicantName}
- Address: ${applicantAddress}
- Phone: ${applicantPhone}

DEPARTMENT: ${departmentNames[department] || department}

${contextSection}

INFORMATION TO BE REQUESTED:
${defaultInformationRequests}
${customRequestsText}

REQUIREMENTS:
1. Use proper formal government correspondence format
2. Include all mandatory elements as per RTI Act, 2005
3. Reference specific sections of the RTI Act where applicable
4. Include a statement about willingness to pay prescribed fees
5. Request information within the 30-day statutory period
6. Be specific and detailed in information requests
7. Maintain respectful and professional tone throughout
8. Format with proper spacing and structure for official use

Generate a complete, ready-to-submit RTI application that the citizen can use directly. Include appropriate salutation, subject line, body, and closing.`
}
