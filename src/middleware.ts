import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const path = req.nextUrl.pathname;
      
      // Public paths that don't require authentication
      if (path === "/" || path.startsWith("/auth") || path.startsWith("/api/auth")) {
        return true;
      }
      
      // All other paths require authentication
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    "/api/user/:path*",
    "/api/events/:path*",
    "/api/businesses/:path*",
  ],
};