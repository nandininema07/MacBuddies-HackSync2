// app/api/escalate-petition/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { petitionId, title, description, category, location, signatureCount } = body

    const supabase = await createClient()

    // 1. Find Matching NGOs based on location or category
    const { data: matchedNGOs, error } = await supabase
      .from("ngos")
      .select("official_email, ngo_name")
      .or(`operational_area.ilike.%${location}%, primary_domain.ilike.%${category}%`)
      .limit(20)

    if (error) throw error

    if (!matchedNGOs || matchedNGOs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No matching NGOs found for this criteria." 
      })
    }

    // 2. Configure Mailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    // 3. Prepare Email List
    const ngoEmails = matchedNGOs.map(ngo => ngo.official_email)

    // 4. Send Email
    await transporter.sendMail({
      from: `"Civil Connect" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to admin/self
      bcc: ngoEmails, // Blind copy NGOs to protect privacy
      subject: `Escalation Alert: ${title}`,
      html: `
        <h3>Petition Escalation Alert</h3>
        <p>A petition in your area requires attention.</p>
        <ul>
          <li><strong>Title:</strong> ${title}</li>
          <li><strong>Category:</strong> ${category}</li>
          <li><strong>Location:</strong> ${location}</li>
          <li><strong>Signatures:</strong> ${signatureCount}</li>
        </ul>
        <p>${description}</p>
      `,
    })

    // 5. Update Petition Status
    await supabase
      .from("petitions")
      .update({ status: 'escalated_to_ngo', escalated_at: new Date().toISOString() })
      .eq("id", petitionId)

    return NextResponse.json({ 
      success: true, 
      contactedCount: ngoEmails.length,
      ngos: matchedNGOs.map(n => n.ngo_name)
    })

  } catch (error: any) {
    console.error("Escalation error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}