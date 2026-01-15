import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenAI } from "@google/genai"
import nodemailer from "nodemailer" 
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

const DEPARTMENT_EMAILS: Record<string, string> = {
  pwd: "chief.engineer@pwd.mumbai.gov.fake",
  municipal: "ward.officer.kwest@mcgm.gov.fake",
  water: "hydraulics.dept@jal.maharashtra.gov.fake",
  electrical: "consumer.grievance@best.mumbai.fake",
  general: "public.info.officer@maharashtra.gov.fake",
}

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
      applicantEmail, 
      customRequests,
      language = "en",
    } = body

    const supabase = await createClient()

    let reportData: any = null
    if (reportId) {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single()
      reportData = data
    }

    let projectData: any = null
    if (projectId) {
      const { data } = await supabase
        .from("government_projects")
        .select("*")
        .eq("id", projectId)
        .single()
      projectData = data
    }

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    })

    const finalText = typeof response.text === 'function' ? response.text : response.text;

    
    let emailStatus = "skipped"
    let recipientEmail = DEPARTMENT_EMAILS[department] || "admin@gov.fake"

    if (finalText && applicantEmail) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail", 
          auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS, 
          },
        })

        const mailOptions = {
          from: `"RTI Portal (on behalf of ${applicantName})" <${process.env.EMAIL_USER}>`, 
          to: recipientEmail, 
          replyTo: applicantEmail, 
          cc: applicantEmail, 
          
          subject: `RTI Application: ${reportData?.category || "Infrastructure Issue"} - ${applicantName}`,
          
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p><strong>To: Public Information Officer</strong></p>
              <p><strong>Department: ${department.toUpperCase()}</strong></p>
              <hr />
              <p style="background-color: #f3f4f6; padding: 10px; border-left: 4px solid #3b82f6;">
                <strong>System Note:</strong> This application is submitted via the Citizen RTI Portal on behalf of <strong>${applicantName}</strong>. 
                <br/>
                Please click <strong>Reply</strong> to respond directly to the applicant at <a href="mailto:${applicantEmail}">${applicantEmail}</a>.
              </p>
              <br/>
              <pre style="font-family: inherit; white-space: pre-wrap;">${finalText}</pre>
              <hr />
            </div>
          `,
        }

        await transporter.sendMail(mailOptions)
        emailStatus = "sent"
        
      } catch (emailError) {
        console.error("Mailer failed:", emailError)
        emailStatus = "failed"
      }
    }

    return NextResponse.json({
      success: true,
      generatedText: finalText, 
      emailStatus: emailStatus, 
      sentTo: recipientEmail,
      reportData,
      projectData,
    })

  } catch (error) {
    console.error("RTI generation error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate RTI application" },
      { status: 500 }
    )
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
- Type: ${report.category?.toUpperCase()}
- Location: ${report.address || `Lat: ${report.latitude}, Long: ${report.longitude}`}
- Description: ${report.description}
- Status: ${report.status}
`
  }

  if (project) {
    contextSection += `
RELATED GOVERNMENT PROJECT:
- Project Name: ${project.name}
- Budget: ₹${project.budget}
- Contractor: ${project.contractor_name}
`
  }

  const defaultRequests = `
1. Certified copies of administrative and technical sanction orders
2. Budget allocation and expenditure details
3. Tender and contractor selection documents
4. Quality inspection reports
5. Current status and delay reasons
`

  const customRequestsText = customRequests?.length
    ? customRequests.map((r, i) => `${i + 6}. ${r}`).join("\n")
    : ""

  return `
You are an expert legal assistant specializing in drafting RTI applications under the RTI Act, 2005 (India).

${langInstruction}

APPLICANT DETAILS:
Name: ${applicantName}
Address: ${applicantAddress}
Phone: ${applicantPhone}

DEPARTMENT:
${departmentNames[department] || department}

${contextSection}

INFORMATION SOUGHT:
${defaultRequests}
${customRequestsText}

Include:
- Proper RTI format
- Reference to RTI Act, 2005
- 30-day response clause
- Willingness to pay fees
- Formal tone
FORMAT STRICTLY AS A GOVERNMENT DOCUMENT:
- no bold text
- Align numbered lists cleanly
- Keep professional spacing
- Ensure print-ready formatting (A4)

Generate a complete, submission-ready RTI application.
`
}