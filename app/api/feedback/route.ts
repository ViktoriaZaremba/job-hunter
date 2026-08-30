import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, message, page } = body;

    if (!type || !message?.trim()) {
      return NextResponse.json(
        { error: "type and message are required" },
        { status: 400 }
      );
    }

    const typeLabels: Record<string, string> = {
      bug: "🐛 Bug Report",
      feature: "💡 Feature Request",
      other: "💬 Other",
    };

    const typeLabel = typeLabels[type] ?? type;

    const { error } = await resend.emails.send({
      from: "Job Hunter Feedback <onboarding@resend.dev>",
      to: [process.env.FEEDBACK_EMAIL ?? session.user.email],
      subject: `[Feedback] ${typeLabel}`,
      html: `
        <div style="font-family: Inter, ui-sans-serif, system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1d2939;">
          <div style="background: #f8f9fb; border-radius: 12px; padding: 32px;">
            <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1d2939;">
              ${typeLabel}
            </h2>
            <p style="margin: 0 0 24px; font-size: 13px; color: #667085;">
              From <strong>${session.user.email}</strong>${page ? ` · Page: <code style="background:#eaecef;padding:1px 5px;border-radius:4px;">${page}</code>` : ""}
            </p>

            <div style="background: #ffffff; border: 1px solid #eaecef; border-radius: 10px; padding: 20px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    );
  }
}
