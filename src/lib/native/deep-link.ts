/** Map fieldreport:// or https host paths into in-app routes. */
export function pathFromDeepLink(url: string): string | null {
  try {
    if (url.startsWith("fieldreport://")) {
      const rest = url.replace(/^fieldreport:\/\//, "");
      return rest.startsWith("/") ? rest : `/${rest}`;
    }
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return null;
  }
}
