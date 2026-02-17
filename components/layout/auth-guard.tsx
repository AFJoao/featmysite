"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredType: "personal" | "student";
}

export function AuthGuard({ children, requiredType }: AuthGuardProps) {
  const { user, userType, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (userType && userType !== requiredType) {
      const redirectPath =
        userType === "personal"
          ? "/personal/dashboard"
          : "/student/dashboard";
      router.replace(redirectPath);
    }
  }, [user, userType, isLoading, requiredType, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || (userType && userType !== requiredType)) {
    return null;
  }

  return <>{children}</>;
}
