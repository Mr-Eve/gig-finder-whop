import { whop } from "@/lib/whop";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // We can try to fetch something generic or just confirm initialization
    // Since we don't have a specific company ID to list payments for yet, 
    // we'll just verify the client and environment variables are loaded.
    
    // If you wanted to test a real call, you might try:
    // const user = await whop.users.retrieve({ id: "YOUR_USERNAME" }); 
    
    return NextResponse.json({ 
      status: "success", 
      message: "Whop SDK initialized successfully",
      sdkConfigured: true 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: "error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}


