"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Jobs", href: "/dashboard/jobs" },
    { name: "Companies", href: "/dashboard/companies" },
    { name: "Analytics", href: "/dashboard/analytics" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand + nav */}
        <div className="flex items-center gap-6 sm:gap-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 sm:gap-2.5 text-[16px] sm:text-[18px] font-semibold tracking-tight text-text-primary"
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

        {/* Profile area + mobile hamburger */}
        <div className="flex items-center gap-2">
          {session?.user && (
            <>
              <span className="hidden lg:block text-sm text-text-secondary">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden md:flex btn-ghost h-9 px-3"
                title="Logout"
              >
                <LogOut size={16} />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden btn-ghost h-9 w-9 p-0"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-line bg-surface px-4 py-3 space-y-1">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-xl text-[15px] font-medium transition ${
                  active
                    ? "text-text-primary bg-muted"
                    : "text-text-secondary hover:text-text-primary hover:bg-muted/60"
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          {session?.user && (
            <div className="border-t border-line pt-3 mt-2">
              <p className="px-3 text-[12px] text-text-muted mb-2 truncate">
                {session.user.email}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[15px] font-medium text-text-secondary hover:text-text-primary hover:bg-muted/60 transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      )}
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
