import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type UseScrollSpyOptions = {
  /** 锚点前缀，最终元素 id 为 `${prefix}${sectionId}` */
  idPrefix?: string;
  /** 距滚动容器顶部的探测线偏移（px），用于判定当前激活分区 */
  probeOffset?: number;
  /** 点击跳转时，分区顶部与容器顶部的间距（px） */
  scrollPadding?: number;
  /** 程序化滚动锁定最长等待（ms），超时后恢复滚动侦测 */
  lockTimeoutMs?: number;
};

function sectionTopInContainer(container: HTMLElement, el: HTMLElement) {
  return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
}

/** 与目标滚动位置的容差（px）；smooth 滚动末尾常有亚像素偏差 */
const SETTLE_TOLERANCE_PX = 8;

export function useScrollSpy(
  sectionIds: string[],
  containerRef: RefObject<HTMLElement | null>,
  options?: UseScrollSpyOptions,
) {
  const idPrefix = options?.idPrefix ?? "archive-section-";
  const probeOffset = options?.probeOffset ?? 20;
  const scrollPadding = options?.scrollPadding ?? 8;
  const lockTimeoutMs = options?.lockTimeoutMs ?? 2500;

  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  /** 程序化跳转目标：到达前忽略滚动侦测，避免途经分区闪烁导航 */
  const lockTargetRef = useRef<string | null>(null);
  const lockTopRef = useRef<number | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sectionIdsRef = useRef(sectionIds);
  const probeOffsetRef = useRef(probeOffset);
  const scrollPaddingRef = useRef(scrollPadding);
  const resolveActiveRef = useRef<() => void>(() => undefined);

  sectionIdsRef.current = sectionIds;
  probeOffsetRef.current = probeOffset;
  scrollPaddingRef.current = scrollPadding;

  const clearLockTimers = () => {
    if (lockTimerRef.current !== undefined) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = undefined;
    }
  };

  const releaseLock = useCallback(() => {
    lockTargetRef.current = null;
    lockTopRef.current = null;
    clearLockTimers();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sectionIds.length === 0) return;

    const resolveActive = () => {
      const ids = sectionIdsRef.current;
      if (ids.length === 0) return;

      const lockedId = lockTargetRef.current;
      const lockedTop = lockTopRef.current;
      if (lockedId !== null && lockedTop !== null) {
        if (Math.abs(container.scrollTop - lockedTop) > SETTLE_TOLERANCE_PX) {
          // 仍在平滑滚动途中：保持点击目标高亮，不切换途经分区
          return;
        }
        releaseLock();
        setActiveId(lockedId);
        return;
      }

      const probe = container.scrollTop + probeOffsetRef.current;
      let bestId = ids[0] ?? "";

      for (const id of ids) {
        const el = container.querySelector<HTMLElement>(`#${CSS.escape(idPrefix + id)}`);
        if (!el) continue;
        if (sectionTopInContainer(container, el) <= probe + 1) {
          bestId = id;
        }
      }

      setActiveId(bestId);
    };

    resolveActiveRef.current = resolveActive;

    const onUserInterrupt = () => {
      if (lockTargetRef.current === null) return;
      releaseLock();
      resolveActive();
    };

    container.addEventListener("scroll", resolveActive, { passive: true });
    container.addEventListener("wheel", onUserInterrupt, { passive: true });
    container.addEventListener("touchmove", onUserInterrupt, { passive: true });
    resolveActive();

    return () => {
      container.removeEventListener("scroll", resolveActive);
      container.removeEventListener("wheel", onUserInterrupt);
      container.removeEventListener("touchmove", onUserInterrupt);
      clearLockTimers();
    };
  }, [containerRef, idPrefix, releaseLock, sectionIds]);

  const scrollTo = useCallback(
    (sectionId: string) => {
      const container = containerRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(`#${CSS.escape(idPrefix + sectionId)}`);
      if (!el) return;

      const top = Math.max(0, sectionTopInContainer(container, el) - scrollPaddingRef.current);

      setActiveId(sectionId);
      clearLockTimers();

      // 已在目标位置：无需滚动，直接同步
      if (Math.abs(container.scrollTop - top) <= SETTLE_TOLERANCE_PX) {
        releaseLock();
        return;
      }

      lockTargetRef.current = sectionId;
      lockTopRef.current = top;

      const finishProgrammatic = () => {
        if (lockTargetRef.current !== sectionId) return;
        releaseLock();
        setActiveId(sectionId);
        // 再解析一次，处理末尾微调后的真实位置
        resolveActiveRef.current();
      };

      const onScrollEnd = () => {
        container.removeEventListener("scrollend", onScrollEnd);
        finishProgrammatic();
      };

      container.addEventListener("scrollend", onScrollEnd);
      container.scrollTo({ top, behavior: "smooth" });

      // scrollend 兼容性不足或未触发时的兜底
      lockTimerRef.current = setTimeout(() => {
        container.removeEventListener("scrollend", onScrollEnd);
        finishProgrammatic();
      }, lockTimeoutMs);
    },
    [containerRef, idPrefix, lockTimeoutMs, releaseLock],
  );

  return { activeSectionId: activeId, scrollTo };
}
