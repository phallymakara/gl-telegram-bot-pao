/**
 * @file useLazyRecords.ts
 * @description Hook providing progressive lazy loading (infinite scroll) for data tables.
 * Loads records in batches of 15 and displays smooth loading animations when scrolling down.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MOCK_DELAYS } from "../config/mockDelay";

export interface UseLazyRecordsOptions {
  initialCount?: number;
  batchSize?: number;
  delayMs?: number;
}

export function useLazyRecords<T>(
  records: T[],
  options: UseLazyRecordsOptions = {}
) {
  const { initialCount = 15, batchSize = 15, delayMs = MOCK_DELAYS.SCROLL_MORE_MS } = options;
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset count whenever the source records change (e.g. search / filter changes)
  useEffect(() => {
    setDisplayCount(initialCount);
    setIsLoadingMore(false);
  }, [records, initialCount]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || displayCount >= records.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + batchSize, records.length));
      setIsLoadingMore(false);
    }, delayMs);
  }, [isLoadingMore, displayCount, records.length, batchSize, delayMs]);

  // Handle scroll event on scrollable container
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (
        scrollHeight - scrollTop - clientHeight < 100 &&
        !isLoadingMore &&
        displayCount < records.length
      ) {
        loadMore();
      }
    },
    [isLoadingMore, displayCount, records.length, loadMore]
  );

  // IntersectionObserver for sentinel element at bottom of list
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && displayCount < records.length) {
          loadMore();
        }
      },
      { rootMargin: "100px", threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, isLoadingMore, displayCount, records.length]);

  const visibleRecords = useMemo(
    () => records.slice(0, displayCount),
    [records, displayCount]
  );

  const hasMore = displayCount < records.length;
  const currentShown = Math.min(displayCount, records.length);

  return {
    visibleRecords,
    displayCount: currentShown,
    totalRecords: records.length,
    isLoadingMore,
    hasMore,
    sentinelRef,
    handleScroll,
    loadMore,
  };
}

export default useLazyRecords;
