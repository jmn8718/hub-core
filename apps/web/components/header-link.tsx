"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderLink({
  href = "#",
  name,
}: {
  name: string;
  href?: string;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={pathname === href ? "font-bold" : "text-muted-foreground"}
    >
      {name}
    </Link>
  );
}
