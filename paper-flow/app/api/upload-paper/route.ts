import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const response = await fetch("http://localhost:8000/extract", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("Python backend failed");
    }

    const data = await response.json();

    return NextResponse.json({ extractedText: data.text });
  } catch (err) {
    console.error("Error in upload-paper", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}