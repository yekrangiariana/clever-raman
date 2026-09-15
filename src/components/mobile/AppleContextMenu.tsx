import { Component, JSX, Show, For, createMemo, createEffect } from 'solid-js';

export interface ContextMenuItem {
  label: string;
  icon?: JSX.Element;
  destructive?: boolean;
  onClick: () => void;
}

export interface ContextMenuGroup {
  items: ContextMenuItem[];
}

interface AppleContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect?: DOMRect | null;
  groups: ContextMenuGroup[];
}

export const AppleContextMenu: Component<AppleContextMenuProps> = (props) => {
  let mountTime = 0;
  
  createEffect(() => {
    if (props.isOpen) mountTime = Date.now();
  });

  const getStyle = createMemo(() => {
    if (!props.triggerRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    
    const rect = props.triggerRect;
    const estimatedHeight = props.groups.reduce((acc, group) => acc + (group.items.length * 44), 0);
    const spaceBelow = window.innerHeight - rect.bottom;
    
    const openUpwards = spaceBelow < estimatedHeight + 20 && rect.top > spaceBelow;

    // Intelligent horizontal anchoring:
    // If the trigger element spans most of the screen (like a track row), pin to the right like Apple Music.
    // If it's a smaller element (like an Album Card in a grid), align it horizontally with the element itself.
    const isFullWidth = rect.width > window.innerWidth * 0.7;
    const isLeftSide = rect.left < window.innerWidth / 2;
    
    const horizontalAnchor = isFullWidth
      ? { right: '16px' }
      : isLeftSide
      ? { left: `${Math.max(16, rect.left)}px` }
      : { right: `${Math.max(16, window.innerWidth - rect.right)}px` };
    
    if (openUpwards) {
      return {
        position: 'absolute' as const,
        bottom: `${window.innerHeight - rect.top + 8}px`,
        ...horizontalAnchor,
        maxHeight: `calc(${rect.top}px - 24px)`,
        overflowY: 'auto' as const
      };
    } else {
      return {
        position: 'absolute' as const,
        top: `${rect.bottom + 8}px`,
        ...horizontalAnchor,
        maxHeight: `calc(100vh - ${rect.bottom + 24}px)`,
        overflowY: 'auto' as const
      };
    }
  });

  return (
    <Show when={props.isOpen}>
      <div 
        class="fixed inset-0 z-[100] bg-black/10 backdrop-blur-sm"
        onClick={(e) => {
          // Prevent mobile ghost clicks (synthesized clicks right after touchend) from instantly closing the menu
          if (Date.now() - mountTime < 400) {
            e.stopPropagation();
            return;
          }
          props.onClose();
        }}
      >
        <div 
          class="w-[260px] bg-black/65 backdrop-blur-3xl text-white border border-white/15 rounded-2xl shadow-2xl flex flex-col animate-scale-in overflow-hidden"
          style={getStyle()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Groups */}
          <div class="flex flex-col divide-y divide-white/10">
            <For each={props.groups}>
              {(group) => (
                <div class="flex flex-col">
                  <For each={group.items}>
                    {(item) => (
                      <button
                        onClick={() => {
                          item.onClick();
                          props.onClose();
                        }}
                        class={`w-full h-[48px] px-4 flex items-center justify-between text-left text-[15px] active:bg-white/15 active:scale-[0.98] transition-all ${
                          item.destructive ? 'text-[#FF453A]' : 'text-white'
                        }`}
                      >
                        <span class={item.destructive ? 'font-bold' : 'font-medium'}>{item.label}</span>
                        <Show when={item.icon}>
                          <span class={`shrink-0 ml-2 ${item.destructive ? 'text-[#FF453A]' : 'text-white'}`}>
                            {item.icon}
                          </span>
                        </Show>
                      </button>
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
};
