import { NextResponse } from "next/server";
import { searchAllGigs } from "@/lib/scrapers/aggregator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (!query) {
    return NextResponse.json({ gigs: [] });
  }

  try {
    const gigs = await searchAllGigs(query);
    return NextResponse.json({ gigs });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to fetch gigs" }, { status: 500 });
  }
}
