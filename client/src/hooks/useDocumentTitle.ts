import { useEffect } from "react";

import { formatDocumentTitle } from "@/config/app";

export function useDocumentTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = formatDocumentTitle(pageTitle);
  }, [pageTitle]);
}
