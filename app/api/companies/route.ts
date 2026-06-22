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

    const { data: companies, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");

    if (error) throw error;

    const transformedCompanies = companies?.map(c => ({
      id: c.id,
      name: c.name,
      careersUrl: c.careers_url,
      createdAt: c.created_at,
    }));

    return NextResponse.json(transformedCompanies || []);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        name: body.name,
        careers_url: body.careersUrl,
      })
      .select()
      .single();

    if (error) throw error;

    const transformed = {
      id: company.id,
      name: company.name,
      careersUrl: company.careers_url,
      createdAt: company.created_at,
    };

    return NextResponse.json(transformed, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
