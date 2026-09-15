import { createSignal } from 'solid-js';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface FoldBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FoldState {
  isTabletop: boolean;
  state: 'FLAT' | 'HALF_OPENED' | 'UNKNOWN';
  orientation: 'HORIZONTAL' | 'VERTICAL' | 'UNKNOWN';
  bounds: FoldBounds | null;
}

const defaultFoldState: FoldState = {
  isTabletop: false,
  state: 'FLAT',
  orientation: 'UNKNOWN',
  bounds: null,
};

export const [foldState, setFoldState] = createSignal<FoldState>(defaultFoldState);

if (Capacitor.isNativePlatform()) {
  try {
    const FoldablePlugin = registerPlugin<any>('FoldablePlugin');
    
    const updateState = (info: FoldState) => {
      if (info) {
        setFoldState({
          isTabletop: !!info.isTabletop,
          state: info.state || 'FLAT',
          orientation: info.orientation || 'UNKNOWN',
          bounds: info.bounds || null,
        });
      }
    };

    FoldablePlugin.addListener('onFoldStateChange', updateState);
    FoldablePlugin.getFoldState().then(updateState).catch(() => {});
  } catch (e) {
    console.warn('FoldablePlugin not available', e);
  }
}
