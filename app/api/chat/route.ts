import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY in your .env file." },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // Use a stable model that exists - matching the pattern from audit route
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Build conversation context with system prompt
    const systemPrompt = `You are a helpful assistant for a civic engagement platform called "Civil Connect" that helps citizens report infrastructure issues, track government projects, and engage with their community.

Your role is to:
- Help users understand how to use the platform
- Answer questions about infrastructure reporting, petitions, and government projects
- Provide guidance on civic engagement and community participation
- Be friendly, informative, and encouraging

Keep responses concise, clear, and helpful. If asked about something outside your knowledge, politely redirect to relevant platform features.`

    // Build the full prompt with conversation history
    let fullPrompt = systemPrompt + "\n\n"
    
    // Add conversation history if available
    if (conversationHistory.length > 0) {
      fullPrompt += "Previous conversation:\n"
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        const roleLabel = msg.role === "user" ? "User" : "Assistant"
        fullPrompt += `${roleLabel}: ${msg.content}\n\n`
      })
    }
    
    // Add the current user message
    fullPrompt += `User: ${message}\n\nAssistant:`

    // Use generateContent directly (more reliable than startChat)
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ 
      message: text,
      success: true 
    })
  } catch (error) {
    console.error("Chat API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { 
        error: "Failed to get response from chatbot",
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
