"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

const LOGIN_PATH = "/login";
const AUTH_EXPIRED_ERROR = "AUTH_EXPIRED";

export class AuthExpiredError extends Error {
  constructor() {
    super("登录已过期，请重新登录");
    this.name = AUTH_EXPIRED_ERROR;
  }
}

export function isAuthExpiredError(error: unknown): error is AuthExpiredError {
  return error instanceof Error && error.name === AUTH_EXPIRED_ERROR;
}

function isAuthOptionalPath(pathname: string | null) {
  return pathname?.startsWith("/login") || pathname?.startsWith("/gallery");
}

export function useAuthRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthOptional = isAuthOptionalPath(pathname);

  const redirectToLogin = useCallback(() => {
    if (!isAuthOptional) router.replace(LOGIN_PATH);
  }, [isAuthOptional, router]);

  const throwAuthExpired = useCallback((): never => {
    redirectToLogin();
    throw new AuthExpiredError();
  }, [redirectToLogin]);

  return { isAuthOptional, redirectToLogin, throwAuthExpired };
}
