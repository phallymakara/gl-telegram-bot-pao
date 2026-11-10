import React, { useEffect, useRef, useState } from "react";

interface DraggableModalBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  resetKey?: unknown;
}

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, option, [role='button'], [data-no-drag]";

/**
 * Reusable draggable modal dialog container.
 * Allows users to drag the modal header bar to reposition the dialog anywhere within the viewport
 * while preserving normal text selection and input interactions inside the modal body.
 */
export default function DraggableModalBox({
  children,
  className = "",
  style,
  resetKey,
  onClick,
  ...rest
}: DraggableModalBoxProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [resetKey]);

  useEffect(() => {
    const panelEl = panelRef.current;
    if (!panelEl) return;

    const getHandleElement = (): HTMLElement | null => {
      const explicit = panelEl.querySelector("[data-drag-handle]") as HTMLElement | null;
      if (explicit) return explicit;
      const first = panelEl.firstElementChild as HTMLElement | null;
      if (!first) return null;
      if (first.tagName === "FORM") {
        return first.firstElementChild as HTMLElement | null;
      }
      return first;
    };

    const handleEl = getHandleElement();
    if (!handleEl) return;

    const prevCursor = handleEl.style.cursor;
    const prevTouchAction = handleEl.style.touchAction;
    handleEl.style.cursor = "move";
    handleEl.style.touchAction = "none";

    let cleanupDragListeners: (() => void) | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl) return;
      if (!handleEl.contains(targetEl)) return;
      if (targetEl.closest(INTERACTIVE_SELECTOR)) return;

      e.preventDefault();
      const rect = panelEl.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startOffsetX = offsetRef.current.x;
      const startOffsetY = offsetRef.current.y;

      // Clamp translation so all four edges of the modal stay strictly inside the page/viewport
      const padding = 8;
      const minDeltaX = Math.min(0, padding - rect.left);
      const maxDeltaX = Math.max(0, window.innerWidth - padding - rect.right);
      const minDeltaY = Math.min(0, padding - rect.top);
      const maxDeltaY = Math.max(0, window.innerHeight - padding - rect.bottom);

      setIsDragging(true);
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";

      const onPointerMove = (moveEvt: PointerEvent) => {
        const rawDx = moveEvt.clientX - startX;
        const rawDy = moveEvt.clientY - startY;
        const clampedDx = Math.min(Math.max(rawDx, minDeltaX), maxDeltaX);
        const clampedDy = Math.min(Math.max(rawDy, minDeltaY), maxDeltaY);
        setOffset({
          x: startOffsetX + clampedDx,
          y: startOffsetY + clampedDy,
        });
      };

      const stopDrag = () => {
        setIsDragging(false);
        document.body.style.userSelect = prevUserSelect;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", stopDrag);
        window.removeEventListener("pointercancel", stopDrag);
        cleanupDragListeners = null;
      };

      cleanupDragListeners = stopDrag;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDrag);
      window.addEventListener("pointercancel", stopDrag);
    };

    handleEl.addEventListener("pointerdown", onPointerDown);

    return () => {
      handleEl.removeEventListener("pointerdown", onPointerDown);
      handleEl.style.cursor = prevCursor;
      handleEl.style.touchAction = prevTouchAction;
      if (cleanupDragListeners) cleanupDragListeners();
    };
  }, []);

  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  return (
    <div
      ref={panelRef}
      {...rest}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      className={className}
      style={{
        ...style,
        position: "relative",
        zIndex: 1,
        left: `${offset.x}px`,
        top: `${offset.y}px`,
        transition: isDragging ? "none" : style?.transition,
      }}
    >
      {children}
    </div>
  );
}

