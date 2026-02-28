import { InsforgeMiddleware } from "@insforge/nextjs/middleware";

export default InsforgeMiddleware({
  baseUrl:
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
    "https://2674danq.ap-southeast.insforge.app",
  publicRoutes: ["/", "/login", "/register", "/api"],
  signInUrl: "/login",
  signUpUrl: "/register",
  afterSignInUrl: "/dashboard",
  useBuiltInAuth: false,
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
