import Link from "next/link";
import { ArrowRight, Layers, ListChecks, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <span className="pill bg-muted text-text-secondary mb-6">
            Personal ATS for tech professionals
          </span>
          <h1 className="text-display text-text-primary tracking-tight">
            A calm workspace for your job search.
          </h1>
          <p className="text-body text-text-secondary mt-5 max-w-xl mx-auto">
            Track every conversation, automate vacancy discovery, and stay on top
            of every stage in one place.
          </p>

          <div className="flex justify-center gap-3 mt-10">
            <Link href="/auth/signin" className="btn-primary h-11 px-5">
              Sign in with Google
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-24">
          <Feature
            icon={<Sparkles size={20} />}
            title="Vacancy radar"
            description="Auto-scan watched companies for new openings that match your criteria."
          />
          <Feature
            icon={<Layers size={20} />}
            title="Pipeline board"
            description="See every application by stage, from resume sent to final offer."
          />
          <Feature
            icon={<ListChecks size={20} />}
            title="Lightweight ATS"
            description="Notes, contacts, compensation, and an activity log for each role."
          />
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold text-text-primary">{title}</h3>
      <p className="text-[14px] text-text-secondary mt-1.5 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
