export const APP_NAME = "人力资源平台";

export function formatDocumentTitle(pageTitle?: string): string {
  if (!pageTitle) return APP_NAME;
  return `${pageTitle} · ${APP_NAME}`;
}
