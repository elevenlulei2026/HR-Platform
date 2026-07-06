import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type UseScrollSpyOptions = {
  /** 锚点前缀，最终元素 id 为 `${prefix}${sectionId}` */
  idPrefix?: string;
  /** IntersectionObserver rootMargin */
  rootMargin?: string;
};

export function useScrollSpy(
  sectionIds: string[],
  containerRef: RefObject<HTMLElement | null>,
  options?: UseScrollSpyOptions,
) {
  const idPrefix = options?.idPrefix ?? "archive-section-";
  const rootMargin = options?.rootMargin ?? "-18% 0px -55% 0px";
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  const isProgrammaticScroll = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sectionIds.length === 0) return;

    const resolveActive = () => {
      if (isProgrammaticScroll.current) return;
      const containerRect = container.getBoundingClientRect();
      const anchorY = containerRect.top + containerRect.height * 0.22;

      let bestId = sectionIds[0] ?? "";
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const id of sectionIds) {
        const el = container.querySelector<HTMLElement>(`#${CSS.escape(idPrefix + id)}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        const distance = Math.abs(top - anchorY);
        if (top <= anchorY + 8 && distance < bestDistance) {
          bestDistance = distance;
          bestId = id;
        }
      }

      if (bestId) setActiveId(bestId);
    };

    const observer = new IntersectionObserver(
      () => resolveActive(),
      { root: container, rootMargin, threshold: [0, 0.1, 0.25, 0.5] },
    );

    for (const id of sectionIds) {
      const el = container.querySelector(`#${CSS.escape(idPrefix + id)}`);
      if (el) observer.observe(el);
    }

    container.addEventListener("scroll", resolveActive, { passive: true });
    resolveActive();

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", resolveActive);
    };
  }, [containerRef, idPrefix, rootMargin, sectionIds]);

  const scrollTo = useCallback(
    (sectionId: string) => {
      const container = containerRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(`#${CSS.escape(idPrefix + sectionId)}`);
      if (!el) return;

      setActiveId(sectionId);
      isProgrammaticScroll.current = true;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);

      const top = el.offsetTop - 12;
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

      scrollTimer.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 700);
    },
    [containerRef, idPrefix],
  );

  return { activeSectionId: activeId, scrollTo };
}
