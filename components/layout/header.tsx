"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Users,
  Dumbbell,
  Plus,
  MessageSquare,
  LogOut,
  ChevronLeft,
  User,
} from "lucide-react";

interface HeaderProps {
  title: string;
  backHref?: string;
  variant?: "personal" | "student";
}

export function Header({ title, backHref, variant = "personal" }: HeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const personalLinks = [
    { href: "/personal/dashboard", label: "Dashboard", icon: Users },
    { href: "/personal/exercises", label: "Exercicios", icon: Dumbbell },
    { href: "/personal/create-workout", label: "Criar Treino", icon: Plus, primary: true },
    { href: "/personal/feedbacks", label: "Feedbacks", icon: MessageSquare },
  ];

  const links = variant === "personal" ? personalLinks : [];
  const isCurrentPage = (href: string) => pathname === href;

  return (
    <header className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] px-6 py-5 shadow-md lg:px-10">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center rounded-md border border-white/30 bg-white/10 p-2.5 text-primary-foreground transition-colors hover:border-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          )}
          {!backHref && (
            <div className="text-primary-foreground">
              {variant === "personal" ? (
                <Users className="h-8 w-8" />
              ) : (
                <User className="h-8 w-8" />
              )}
            </div>
          )}
          <h1 className="text-xl font-semibold text-primary-foreground lg:text-2xl">
            {title}
          </h1>
        </div>

        <nav className="flex items-center gap-2 lg:gap-3">
          {links
            .filter((link) => !isCurrentPage(link.href))
            .map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`hidden items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors sm:flex lg:px-4 ${
                    link.primary
                      ? "border-white bg-white text-primary hover:bg-white/90"
                      : "border-white/30 bg-transparent text-primary-foreground hover:border-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{link.label}</span>
                </Link>
              );
            })}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md border border-white/30 bg-transparent px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:border-white hover:bg-white/10 lg:px-4"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
