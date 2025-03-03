import { Frame } from "lucide-react";
import Link from "next/link";
import { SignOut } from "@/components/signout-button";
import { HeaderLink } from "@/components/header-link";

export function Header() {
  return (
    <header className="min-w-screen flex justify-between h-16 px-4 border-b shrink-0 md:px-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-lg font-semibold sm:text-base mr-4"
      >
        <Frame className="w-6 h-6" />
        <span className="sr-only">NTECH</span>
      </Link>
      <nav className="hidden font-medium sm:flex flex-row items-center gap-5 text-sm lg:gap-6">
        <HeaderLink href="/account" name="Account" />
        <HeaderLink href="/subscriptions" name="Subscriptions" />
      </nav>
      <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <SignOut />
      </div>
    </header>
  );
}
