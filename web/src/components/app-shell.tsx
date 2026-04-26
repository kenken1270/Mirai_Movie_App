"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** メイン導線（IG・小紅書・Note 三本柱の運用に寄せる） */
const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/weekly", label: "今週" },
  { href: "/pipeline", label: "制作" },
  { href: "/publishes", label: "投稿" },
  { href: "/analytics", label: "分析" },
  { href: "/retrospectives", label: "振り返り" },
] as const;

const NAV_MORE = [
  { href: "/brand", label: "ブランド" },
  { href: "/scripts", label: "台本" },
  { href: "/script-library", label: "保管庫" },
  { href: "/needs-research", label: "ニーズ" },
  { href: "/hypotheses", label: "仮説" },
  { href: "/idea-stock", label: "ネタストック" },
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
            未来塾 SNS
          </Link>
          <div className="flex max-w-full flex-col gap-1 sm:items-end">
            <nav
              className="flex max-w-full flex-wrap items-center justify-end gap-x-0.5 gap-y-1 text-xs sm:text-sm"
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
            <nav
              className="flex max-w-full flex-wrap items-center justify-end gap-x-0.5 gap-y-0.5 text-[10px] sm:text-xs"
              aria-label="その他"
            >
              {NAV_MORE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-muted-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground",
                    navActive(pathname, item.href) && "bg-muted font-medium text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
