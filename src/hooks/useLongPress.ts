import { createSignal } from 'solid-js';

export function createLongPress(
  onLongPress: (e: TouchEvent | MouseEvent, targetElement: HTMLElement) => void,
  onClick?: (e: MouseEvent) => void,
  duration = 500
) {
  let pressTimer: any;
  let startX = 0;
  let startY = 0;
  let isLongPress = false;
  let targetElement: HTMLElement | null = null;

  const startPress = (e: TouchEvent | MouseEvent) => {
    isLongPress = false;
    
    targetElement = (e.target as HTMLElement).closest('[data-context-target="true"]') as HTMLElement || e.currentTarget as HTMLElement;
    
    if (e.type === 'touchstart') {
      const touch = (e as TouchEvent).touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    } else {
      startX = (e as MouseEvent).clientX;
      startY = (e as MouseEvent).clientY;
    }

    pressTimer = setTimeout(() => {
      isLongPress = true;
      if (navigator.vibrate) navigator.vibrate(50);
      try {
        onLongPress(e, targetElement!);
      } catch (err: any) {
      }
    }, duration);
  };

  const cancelPress = (e: TouchEvent | MouseEvent) => {
    if (e.type === 'touchmove') {
      const touch = (e as TouchEvent).touches[0];
      if (!touch) {
        clearTimeout(pressTimer);
        return;
      }
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(pressTimer);
      }
    } else {
      clearTimeout(pressTimer);
    }
  };

  const finishPress = (e: TouchEvent | MouseEvent) => {
    clearTimeout(pressTimer);
  };

  const handleClick = (e: MouseEvent) => {
    if (isLongPress) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLongPress && e.currentTarget) {
      onLongPress(e, e.currentTarget as HTMLElement);
    }
  };

  return {
    onTouchStart: startPress,
    onTouchMove: cancelPress,
    onTouchEnd: finishPress,
    onTouchCancel: cancelPress,
    onMouseDown: startPress,
    onMouseLeave: cancelPress,
    onMouseUp: finishPress,
    onClick: handleClick,
    onContextMenu: handleContextMenu,
  };
}
