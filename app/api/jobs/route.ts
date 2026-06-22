import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*")
      .order("scraped_at", { ascending: false });

    if (error) throw error;

    const transformedJobs = jobs?.map(job => ({
      id: job.id,
      companyId: job.company_id,
      companyName: job.company_name,
      title: job.title,
      url: job.url,
      description: job.description,
      experience: job.experience,
      scrapedAt: job.scraped_at,
      isRelevant: job.is_relevant,
      matchedKeywords: job.matched_keywords ?? undefined,
    }));

    return NextResponse.json(transformedJobs || []);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
