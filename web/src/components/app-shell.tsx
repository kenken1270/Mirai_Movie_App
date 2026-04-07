"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/weekly", label: "今週" },
  { href: "/brand", label: "ブランド" },
  { href: "/needs-research", label: "ニーズ調査" },
  { href: "/hypotheses", label: "仮説" },
  { href: "/pipeline", label: "パイプライン" },
  { href: "/scripts", label: "台本" },
  { href: "/publishes", label: "投稿" },
  { href: "/analytics", label: "分析" },
  { href: "/retrospectives", label: "振り返り" },
  { href: "/next-actions", label: "次アクション" },
] as const;

function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight">
            未来塾 動画ラボ
          </Link>
          <nav
            className="flex max-w-full flex-wrap items-center gap-x-0.5 gap-y-1 text-xs sm:justify-end sm:text-sm"
            aria-label="メインメニュー"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  navActive(pathname, item.href) && "bg-accent font-medium text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
