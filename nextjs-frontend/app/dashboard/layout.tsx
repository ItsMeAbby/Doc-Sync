import Link from "next/link";
import { Home, List } from "lucide-react";
import Image from "next/image";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-10 w-16 flex flex-col border-r bg-background p-4">
        <div className="flex flex-col items-center gap-8">
          <Link
            href="/"
            className="flex items-center justify-center rounded-full"
          >
            <Image
              src="/images/vinta.png"
              alt="Vinta"
              width={64}
              height={64}
              className="object-cover transition-transform duration-200 hover:scale-105"
            />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <List className="h-5 w-5" />
          </Link>
        </div>
      </aside>
      <main className="ml-16 w-full p-8 bg-muted/40">
        <header className="flex justify-between items-center mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <section className="grid gap-6">{children}</section>
      </main>
    </div>
  );
}