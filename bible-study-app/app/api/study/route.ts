import { NextRequest, NextResponse } from "next/server";
import { runWorkflow, ConversationMessage } from "@/lib/agent";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, history } = body as {
      question: string;
      history?: ConversationMessage[];
    };

    if (!question || typeof question !== "string" || question.trim() === "") {
      return NextResponse.json(
        { error: "A question is required." },
        { status: 400 }
      );
    }

    const answer = await runWorkflow({
      input_as_text: question.trim(),
      history: history ?? []
    });

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json(
      { error: "Failed to get a response from the agent. Please try again." },
      { status: 500 }
    );
  }
}
