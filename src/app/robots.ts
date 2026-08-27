/** Prefer indexing the marketing site; keep private app areas out of search. */
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/login", "/signup", "/forgot-password", "/reset-password"],
    },
  };
}
