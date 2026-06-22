"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Jobs", href: "/dashboard/jobs" },
    { name: "Companies", href: "/dashboard/companies" },
    { name: "Analytics", href: "/dashboard/analytics" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand + nav */}
        <div className="flex items-center gap-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-[18px] font-semibold tracking-tight text-text-primary"
          >
            <Image
              src="/logo.png"
              alt="Job Hunter logo"
              width={28}
              height={28}
              className="rounded-md"
              priority
            />
            Job Hunter
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "text-text-primary bg-muted"
                      : "text-text-secondary hover:text-text-primary hover:bg-muted/60"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile area */}
        <div className="flex items-center gap-3">
          {session?.user && (
            <>
              <span className="hidden md:block text-sm text-text-secondary">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="btn-ghost h-9 px-3"
                title="Logout"
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-canvas">
        <DashboardHeader />
        <main>{children}</main>
      </div>
    </SessionProvider>
  );
}
