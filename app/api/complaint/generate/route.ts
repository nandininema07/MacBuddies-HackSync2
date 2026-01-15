import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
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
      department,
      applicantName,
      applicantAddress,
      applicantPhone,
      applicantEmail, 
      additionalDetails,
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

    const prompt = buildComplaintPrompt({
      report: reportData,
      department,
      applicantName,
      applicantAddress,
      applicantPhone,
      additionalDetails,
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

    const generatedText =
      response.candidates?.[0]?.content?.parts?.[0]?.text || ""

    let emailStatus = "skipped"
    let recipientEmail = DEPARTMENT_EMAILS[department] || "admin@gov.fake"

    if (generatedText && applicantEmail) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail", 
          auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS, 
          },
        })

        const mailOptions = {
          from: `"Civic Complaint Portal (on behalf of ${applicantName})" <${process.env.EMAIL_USER}>`, 
          to: recipientEmail, 
          replyTo: applicantEmail, 
          cc: applicantEmail, 
          
          subject: `Formal Complaint: ${reportData?.category || "Infrastructure Issue"} - ${applicantName}`,
          
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p><strong>To: The Concerned Authority</strong></p>
              <p><strong>Department: ${department.toUpperCase()}</strong></p>
              <hr />
              <p style="background-color: #f3f4f6; padding: 10px; border-left: 4px solid #ef4444;">
                <strong>System Note:</strong> This formal complaint is submitted via the Citizen Grievance Portal on behalf of <strong>${applicantName}</strong>. 
                <br/>
                Please click <strong>Reply</strong> to respond directly to the complainant at <a href="mailto:${applicantEmail}">${applicantEmail}</a>.
              </p>
              <br/>
              <pre style="font-family: inherit; white-space: pre-wrap;">${generatedText}</pre>
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
      generatedText,
      emailStatus,
      sentTo: recipientEmail,
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