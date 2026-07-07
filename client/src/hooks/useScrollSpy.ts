import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type UseScrollSpyOptions = {
  /** 锚点前缀，最终元素 id 为 `${prefix}${sectionId}` */
  idPrefix?: string;
  /** 距滚动容器顶部的探测线偏移（px），用于判定当前激活分区 */
  probeOffset?: number;
  /** 点击跳转时，分区顶部与容器顶部的间距（px） */
  scrollPadding?: number;
};

function sectionTopInContainer(container: HTMLElement, el: HTMLElement) {
  return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
}

export function useScrollSpy(
  sectionIds: string[],
  containerRef: RefObject<HTMLElement | null>,
  options?: UseScrollSpyOptions,
) {
  const idPrefix = options?.idPrefix ?? "archive-section-";
  const probeOffset = options?.probeOffset ?? 20;
  const scrollPadding = options?.scrollPadding ?? 8;
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  const isProgrammaticScroll = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const probeOffsetRef = useRef(probeOffset);
  const scrollPaddingRef = useRef(scrollPadding);

  probeOffsetRef.current = probeOffset;
  scrollPaddingRef.current = scrollPadding;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sectionIds.length === 0) return;

    const resolveActive = () => {
      if (isProgrammaticScroll.current) return;

      const probe = container.scrollTop + probeOffsetRef.current;
      let bestId = sectionIds[0] ?? "";

      for (const id of sectionIds) {
        const el = container.querySelector<HTMLElement>(`#${CSS.escape(idPrefix + id)}`);
        if (!el) continue;
        if (sectionTopInContainer(container, el) <= probe + 1) {
          bestId = id;
        }
      }

      setActiveId(bestId);
    };

    container.addEventListener("scroll", resolveActive, { passive: true });
    resolveActive();

    return () => {
      container.removeEventListener("scroll", resolveActive);
    };
  }, [containerRef, idPrefix, sectionIds]);

  const scrollTo = useCallback(
    (sectionId: string) => {
      const container = containerRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(`#${CSS.escape(idPrefix + sectionId)}`);
      if (!el) return;

      setActiveId(sectionId);
      isProgrammaticScroll.current = true;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);

      const top = sectionTopInContainer(container, el) - scrollPaddingRef.current;
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

      scrollTimer.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 800);
    },
    [containerRef, idPrefix],
  );

  return { activeSectionId: activeId, scrollTo };
}
