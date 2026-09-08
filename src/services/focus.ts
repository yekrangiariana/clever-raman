import { createSignal, createRoot } from 'solid-js';
import { audioPlayer } from './audio';

export type FocusSection = 'topBar' | 'grid' | 'albumDetail' | 'nowPlaying' | 'nowPlayingQueue' | 'nowPlayingQueue_remove' | 'setup' | 'search' | 'search_mode' | 'search_kbd' | 'search_tabs' | 'search_results' | 'settings' | 'settingsModal' | 'exitConfirm' | 'albumFilters';

export interface FocusLocation {
  section: FocusSection;
  index: number;
}

function createFocusEngine() {
  const [currentLocation, setCurrentLocation] = createSignal<FocusLocation>({
    section: 'topBar',
    index: 0,
  });

  const [activeTab, setActiveTab] = createSignal<'home' | 'albums' | 'playlists' | 'nowPlaying' | 'search' | 'settings'>('home');
  const [activeModal, setActiveModal] = createSignal<'none' | 'nowPlaying' | 'albumDetail' | 'settingsServer' | 'settingsAccount' | 'exitConfirm'>('none');
  const [selectedAlbumId, setSelectedAlbumId] = createSignal<string | null>(null);

  let gridColumns = 4;
  let lastFocusedElement: HTMLElement | null = null;
  let cachedHomeRowRanges: { start: number; count: number }[] | null = null;
  let lastHomeRowComputeTime = 0;

  function setGridColumns(cols: number) {
    gridColumns = cols;
  }

  function setFocus(section: FocusSection, index: number, isPointer = false) {
    setCurrentLocation({ section, index });
    const selector = `[data-focusable="true"][data-section="${section}"][data-index="${index}"]`;
    const target = document.querySelector(selector) as HTMLElement | null;
    if (target) {
      syncDOMFocus(section, index, isPointer);
    } else {
      requestAnimationFrame(() => {
        syncDOMFocus(section, index, isPointer);
      });
    }
  }

  function syncDOMFocus(section: FocusSection, index: number, isPointer = false) {
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.classList.remove('focused');
    } else {
      const focusedElements = document.querySelectorAll('.focused');
      focusedElements.forEach((el) => el.classList.remove('focused'));
    }

    const selector = `[data-focusable="true"][data-section="${section}"][data-index="${index}"]`;
    const target = document.querySelector(selector) as HTMLElement | null;

    if (target) {
      target.classList.add('focused');
      lastFocusedElement = target;
      if (!isPointer) {
        // Check for tracklist start index in albumDetail view
        const trackStartAttr = document.querySelector('[data-track-start]')?.getAttribute('data-track-start');
        const trackStartIdx = trackStartAttr ? parseInt(trackStartAttr, 10) : 4;

        if (section === 'topBar') {
          const main = document.querySelector('main');
          if (main) main.scrollTo({ top: 0, behavior: 'auto' });
        } else if (section === 'search_kbd' || section === 'search_mode') {
          // Virtual keyboard and mode switchers are fixed on the left stage
          // Screen must not move down at all while navigating the keyboard
        } else if (section === 'search_tabs') {
          // Top tabs for search (Browse Genres / Artists) -> scroll right pane to top
          const scrollParent = target.closest('.overflow-y-auto') as HTMLElement | null;
          if (scrollParent) {
            scrollParent.scrollTo({ top: 0, behavior: 'auto' });
          }
        } else if (section === 'albumDetail' && index < trackStartIdx) {
          // Top bit of album/playlist view (Back, Play, Shuffle, Queue, Star):
          // Keep stationary and reset tracklist scroll to top if needed
          const tracklist = document.querySelector('[data-track-start]') as HTMLElement | null;
          if (tracklist) {
            tracklist.scrollTo({ top: 0, behavior: 'auto' });
          }
        } else {
          // Find closest VERTICAL scrollable container parent
          let scrollParent: HTMLElement | null = target.parentElement;
          while (scrollParent && scrollParent !== document.body) {
            const style = window.getComputedStyle(scrollParent);
            const isScrollableY =
              (style.overflowY === 'auto' || style.overflowY === 'scroll' || scrollParent.tagName === 'MAIN') &&
              scrollParent.scrollHeight > scrollParent.clientHeight + 5;
            if (isScrollableY) {
              break;
            }
            scrollParent = scrollParent.parentElement;
          }

          const allSectionElements = document.querySelectorAll(`[data-focusable="true"][data-section="${section}"]`);
          const totalCount = allSectionElements.length;

          // Universal last row detection across all grid views
          let isLastRow = false;
          if (section === 'grid') {
            if (activeTab() === 'home') {
              const rows = getHomeRowRanges();
              const curRowIdx = rows.findIndex((r) => index >= r.start && index < r.start + r.count);
              if (curRowIdx >= 0 && curRowIdx === rows.length - 1) {
                isLastRow = true;
              }
            } else {
              const cols = gridColumns || 4;
              const lastRowStartIndex = Math.floor((totalCount - 1) / cols) * cols;
              if (index >= lastRowStartIndex) {
                isLastRow = true;
              }
            }
          } else if (section === 'search' || section === 'search_results') {
            const cols = 3;
            const lastRowStartIndex = Math.floor((totalCount - 1) / cols) * cols;
            if (index >= lastRowStartIndex) {
              isLastRow = true;
            }
          } else if (index >= totalCount - 1) {
            isLastRow = true;
          }

          if (scrollParent) {
            scrollParent.scrollLeft = 0;
            const listRow = (target.closest('[data-variant="list"]') as HTMLElement) || target;
            const isListVariant = listRow.getAttribute('data-variant') === 'list' || section === 'albumDetail' || section.startsWith('albumDetail_');
            const isFirstItem = (section === 'albumDetail' || section.startsWith('albumDetail_')) ? (index === trackStartIdx) : (index === 0);

            if (isFirstItem) {
              // First item in section -> scroll container 100% to top
              scrollParent.scrollTo({ top: 0, behavior: 'auto' });
            } else if (isLastRow && !isListVariant) {
              // Last item or bottom row (grids only) -> scroll container 100% to bottom
              scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: 'auto' });
            } else {
              const parentRect = scrollParent.getBoundingClientRect();

              if (isListVariant) {
                // Synchronous Look-Ahead Edge Scrolling:
                // Keeps at least 1 track visible ahead so the next track is ALWAYS already on screen.
                // Highlight and scroll execute together in the exact same frame.
                const targetRect = listRow.getBoundingClientRect();
                const leadDistance = targetRect.height + 20; // 1 full track row + gap
                const bottomThreshold = parentRect.bottom - leadDistance;
                const topThreshold = parentRect.top + leadDistance;

                if (targetRect.bottom > bottomThreshold) {
                  scrollParent.scrollTop += (targetRect.bottom - bottomThreshold);
                } else if (targetRect.top < topThreshold) {
                  scrollParent.scrollTop -= (topThreshold - targetRect.top);
                }
              } else {
                const targetRect = target.getBoundingClientRect();
                const topClearance = 136;
                const topOffset = 148;
                if (targetRect.bottom > parentRect.bottom - 24) {
                  scrollParent.scrollTop += (targetRect.bottom - parentRect.bottom + 48);
                } else if (targetRect.top < parentRect.top + topClearance) {
                  scrollParent.scrollTop -= (parentRect.top - targetRect.top + topOffset);
                }
              }
            }
          }

          // Always scroll outer card wrapper into view without horizontal shifting (bypass for search, albumDetail, and list items)
          if (!section.startsWith('search') && !section.startsWith('albumDetail') && target.getAttribute('data-variant') !== 'list') {
            const scrollTarget = (target.closest('[data-card-wrapper]') as HTMLElement) || target;
            scrollTarget.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
          }
        }
      }

      if (target.tagName !== 'INPUT') {
        target.focus({ preventScroll: true });
      }
    }
  }

  function getTopBarIndexFromTab(tab: string): number {
    const tabs = ['home', 'albums', 'playlists', 'nowPlaying', 'search', 'settings'];
    const idx = tabs.indexOf(tab);
    return idx >= 0 ? idx : 0;
  }

  function handleKeyDown(e: KeyboardEvent) {
    const keyCode = e.keyCode;

    // Media keys
    switch (keyCode) {
      case 415:
        audioPlayer.play();
        e.preventDefault();
        return;
      case 19:
        audioPlayer.pause();
        e.preventDefault();
        return;
      case 179:
        audioPlayer.togglePlay();
        e.preventDefault();
        return;
      case 413:
        audioPlayer.pause();
        e.preventDefault();
        return;
      case 417:
        audioPlayer.nextTrack();
        e.preventDefault();
        return;
      case 412:
        audioPlayer.previousTrack();
        e.preventDefault();
        return;
    }

    const { section, index } = currentLocation();
    const focusableInSection = document.querySelectorAll(`[data-focusable="true"][data-section="${section}"]`);
    const totalCount = focusableInSection.length;

    switch (keyCode) {
      case 38: // UP
        e.preventDefault();
        handleUp(section, index, totalCount);
        break;

      case 40: // DOWN
        e.preventDefault();
        handleDown(section, index, totalCount);
        break;

      case 37: // LEFT
        e.preventDefault();
        handleLeft(section, index, totalCount);
        break;

      case 39: // RIGHT
        e.preventDefault();
        handleRight(section, index, totalCount);
        break;

      case 13: // ENTER
        e.preventDefault();
        if (!e.repeat) {
          const focused = document.querySelector('.focused');
          if (focused) focused.classList.add('pressed');
        }
        break;

      case 461: // BACK
      case 27:  // ESC
        e.preventDefault();
        handleBack();
        break;
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.keyCode === 13) { // ENTER
      e.preventDefault();
      document.querySelectorAll('.pressed').forEach((el) => el.classList.remove('pressed'));
      const { section, index } = currentLocation();
      triggerClickAt(section, index);
    }
  }

  function getHomeRowRanges(): { start: number; count: number }[] {
    const now = performance.now();
    if (cachedHomeRowRanges && now - lastHomeRowComputeTime < 1500) {
      return cachedHomeRowRanges;
    }

    const focusable = document.querySelectorAll('[data-focusable="true"][data-section="grid"]');
    if (!focusable.length) return [];
    
    // Group elements by their row container (.grid or .overflow-x-auto)
    const rowsMap: Map<Element, HTMLElement[]> = new Map();
    focusable.forEach((el) => {
      const container = el.closest('.grid, .overflow-x-auto') || el.parentElement;
      if (container) {
        if (!rowsMap.has(container)) rowsMap.set(container, []);
        rowsMap.get(container)!.push(el as HTMLElement);
      }
    });

    const result: { start: number; count: number }[] = [];
    rowsMap.forEach((elements) => {
      if (elements.length > 0) {
        elements.sort((a, b) => {
          const idxA = parseInt(a.getAttribute('data-index') || '0', 10);
          const idxB = parseInt(b.getAttribute('data-index') || '0', 10);
          return idxA - idxB;
        });

        const firstIdx = parseInt(elements[0].getAttribute('data-index') || '0', 10);
        result.push({ start: firstIdx, count: elements.length });
      }
    });

    cachedHomeRowRanges = result.sort((a, b) => a.start - b.start);
    lastHomeRowComputeTime = now;
    return cachedHomeRowRanges;
  }

  function handleUp(section: FocusSection, index: number, totalCount: number) {
    if (section === 'grid') {
      if (activeTab() === 'home') {
        const rows = getHomeRowRanges();
        const curRowIdx = rows.findIndex((r) => index >= r.start && index < r.start + r.count);
        if (curRowIdx > 0) {
          const prevRow = rows[curRowIdx - 1];
          setFocus('grid', prevRow.start);
          return;
        } else {
          const topIdx = getTopBarIndexFromTab(activeTab());
          setFocus('topBar', topIdx);
          return;
        }
      }

      if (index - gridColumns >= 0) {
        setFocus('grid', index - gridColumns);
      } else {
        if (activeTab() === 'albums') {
          const filterBtn = document.querySelector('[data-section="albumFilters"]');
          if (filterBtn) {
            setFocus('albumFilters' as FocusSection, Math.min(index, 2));
            return;
          }
        }
        const topIdx = getTopBarIndexFromTab(activeTab());
        setFocus('topBar', topIdx);
      }
    } else if (section === 'albumFilters') {
      setFocus('topBar', getTopBarIndexFromTab('albums'));
    } else if (section === 'albumDetail') {
      const trackStartAttr = document.querySelector('[data-track-start]')?.getAttribute('data-track-start');
      const trackStart = trackStartAttr ? parseInt(trackStartAttr, 10) : 4;
      if (index >= trackStart) {
        if (index === trackStart) setFocus('albumDetail', 1);
        else setFocus('albumDetail', index - 1);
      } else {
        setFocus('topBar', getTopBarIndexFromTab(activeTab()));
      }
    } else if (section === 'nowPlaying') {
      if (index > 0) setFocus('nowPlaying', 0);
    } else if (section === 'nowPlayingQueue') {
      if (index > 0) {
        setFocus('nowPlayingQueue', index - 1);
      } else {
        setFocus('nowPlaying', 7);
      }
    } else if (section === 'nowPlayingQueue_remove') {
      const prevBtn = document.querySelector(`[data-section="nowPlayingQueue_remove"][data-index="${index - 1}"]`);
      if (prevBtn) {
        setFocus('nowPlayingQueue_remove' as FocusSection, index - 1);
      } else {
        setFocus('nowPlayingQueue', 0);
      }
    } else if (section.endsWith('_queue') || section.endsWith('_heart')) {
      const isHeart = section.endsWith('_heart');
      const baseSection = isHeart ? section.replace('_heart', '') : section.replace('_queue', '');
      const prevBtn = document.querySelector(`[data-section="${section}"][data-index="${index - 1}"]`);
      if (prevBtn) {
        setFocus(section as FocusSection, index - 1);
      } else {
        if (baseSection === 'albumDetail') {
          setFocus('albumDetail', 1);
        } else {
          setFocus(baseSection as FocusSection, Math.max(0, index - 1));
        }
      }
    } else if (section === 'setup') {
      if (index > 0) setFocus('setup', index - 1);
    } else if (section === 'search_mode') {
      setFocus('topBar', 4);
    } else if (section === 'search_kbd') {
      if (index < 6) {
        setFocus('search_mode', index <= 2 ? 0 : 1);
      } else if (index < 24) {
        setFocus('search_kbd', index - 6);
      } else {
        const mapRow4To3 = [18, 19, 20, 22, 23];
        setFocus('search_kbd', mapRow4To3[index - 24] ?? 18);
      }
    } else if (section === 'search_tabs') {
      setFocus('topBar', 4);
    } else if (section === 'search_results' || section === 'search') {
      const elem = document.querySelector(`[data-section="${section}"][data-index="${index}"]`);
      const isList = elem?.getAttribute('data-variant') === 'list';
      if (isList) {
        if (index > 0) {
          setFocus(section as FocusSection, index - 1);
        } else {
          const tabsBtn = document.querySelector('[data-section="search_tabs"]');
          if (tabsBtn) setFocus('search_tabs', 0);
          else setFocus('topBar', 4);
        }
      } else {
        if (index >= 3) {
          setFocus(section as FocusSection, index - 3);
        } else {
          const tabsBtn = document.querySelector('[data-section="search_tabs"]');
          if (tabsBtn) setFocus('search_tabs', Math.min(index, 1));
          else setFocus('topBar', 4);
        }
      }
    } else if (section === 'settings') {
      if (index > 0) setFocus('settings', index - 1);
      else setFocus('topBar', getTopBarIndexFromTab('settings'));
    } else if (section === 'settingsModal') {
      if (index > 0) setFocus('settingsModal', index - 1);
    } else if (section === 'exitConfirm') {
      if (index > 0) setFocus('exitConfirm', index - 1);
    }
  }

  function handleDown(section: FocusSection, index: number, totalCount: number) {
    if (section === 'topBar') {
      const modal = activeModal();
      if (modal === 'albumDetail') {
        setFocus('albumDetail', 1);
      } else if (modal === 'nowPlaying') {
        setFocus('nowPlaying', 2);
      } else if (activeTab() === 'search') {
        setFocus('search_mode', 0);
      } else if (activeTab() === 'settings') {
        setFocus('settings', 0);
      } else if (activeTab() === 'albums') {
        const filterBtn = document.querySelector('[data-section="albumFilters"]');
        if (filterBtn) {
          setFocus('albumFilters' as FocusSection, 0);
        } else {
          setFocus('grid', 0);
        }
      } else {
        setFocus('grid', 0);
      }
    } else if (section === 'albumFilters') {
      setFocus('grid', 0);
    } else if (section === 'grid') {
      if (activeTab() === 'home') {
        const rows = getHomeRowRanges();
        const curRowIdx = rows.findIndex((r) => index >= r.start && index < r.start + r.count);
        if (curRowIdx >= 0 && curRowIdx < rows.length - 1) {
          const nextRow = rows[curRowIdx + 1];
          setFocus('grid', nextRow.start);
        }
        return;
      }

      if (index + gridColumns < totalCount) {
        setFocus('grid', index + gridColumns);
      } else if (index < totalCount - 1) {
        setFocus('grid', totalCount - 1);
      }
    } else if (section === 'albumDetail') {
      const trackStartAttr = document.querySelector('[data-track-start]')?.getAttribute('data-track-start');
      const trackStart = trackStartAttr ? parseInt(trackStartAttr, 10) : 4;
      if (index === 0) {
        setFocus('albumDetail', 1);
      } else if (index < trackStart) {
        setFocus('albumDetail', trackStart);
      } else if (index < totalCount - 1) {
        setFocus('albumDetail', index + 1);
      }
    } else if (section === 'nowPlaying') {
      if (index === 0) {
        setFocus('nowPlaying', 2);
      } else if (index === 6) {
        const queueElem = document.querySelector('[data-section="nowPlayingQueue"]');
        if (queueElem) setFocus('nowPlayingQueue', 0);
      }
    } else if (section === 'nowPlayingQueue') {
      if (index < totalCount - 1) setFocus('nowPlayingQueue', index + 1);
    } else if (section === 'nowPlayingQueue_remove') {
      const nextBtn = document.querySelector(`[data-section="nowPlayingQueue_remove"][data-index="${index + 1}"]`);
      if (nextBtn) {
        setFocus('nowPlayingQueue_remove' as FocusSection, index + 1);
      }
    } else if (section.endsWith('_queue') || section.endsWith('_heart')) {
      const nextBtn = document.querySelector(`[data-section="${section}"][data-index="${index + 1}"]`);
      if (nextBtn) {
        setFocus(section as FocusSection, index + 1);
      }
    } else if (section === 'setup') {
      if (index < totalCount - 1) setFocus('setup', index + 1);
    } else if (section === 'search_mode') {
      setFocus('search_kbd', index === 0 ? 0 : 3);
    } else if (section === 'search_kbd') {
      if (index < 18) {
        setFocus('search_kbd', index + 6);
      } else if (index < 24) {
        const mapRow3To4 = [24, 25, 26, 26, 27, 28];
        setFocus('search_kbd', mapRow3To4[index - 18] ?? 26);
      }
    } else if (section === 'search_tabs') {
      setFocus('search_results', 0);
    } else if (section === 'search_results' || section === 'search') {
      const elem = document.querySelector(`[data-section="${section}"][data-index="${index}"]`);
      const isList = elem?.getAttribute('data-variant') === 'list';
      if (isList) {
        if (index < totalCount - 1) setFocus(section as FocusSection, index + 1);
      } else {
        if (index + 3 < totalCount) {
          setFocus(section as FocusSection, index + 3);
        } else if (index < totalCount - 1) {
          setFocus(section as FocusSection, totalCount - 1);
        }
      }
    } else if (section === 'settings') {
      if (index < totalCount - 1) setFocus('settings', index + 1);
    } else if (section === 'settingsModal') {
      if (index < totalCount - 1) setFocus('settingsModal', index + 1);
    } else if (section === 'exitConfirm') {
      if (index < totalCount - 1) setFocus('exitConfirm', index + 1);
    }
  }

  function handleLeft(section: FocusSection, index: number, totalCount: number) {
    if (section === 'topBar') {
      if (index > 0) setFocus('topBar', index - 1);
    } else if (section === 'grid') {
      if (activeTab() === 'home') {
        const rows = getHomeRowRanges();
        const curRowIdx = rows.findIndex((r) => index >= r.start && index < r.start + r.count);
        if (curRowIdx >= 0) {
          const curRow = rows[curRowIdx];
          if (index > curRow.start) {
            setFocus('grid', index - 1);
          } else if (curRowIdx > 0) {
            const prevRow = rows[curRowIdx - 1];
            setFocus('grid', prevRow.start + prevRow.count - 1);
          }
        }
      } else {
        if (index > 0) setFocus('grid', index - 1);
      }
    } else if (section === 'albumDetail') {
      const trackStartAttr = document.querySelector('[data-track-start]')?.getAttribute('data-track-start');
      const trackStart = trackStartAttr ? parseInt(trackStartAttr, 10) : 4;
      if (index < trackStart) {
        if (index > 0) setFocus('albumDetail', index - 1);
      }
    } else if (section === 'nowPlaying') {
      if (index > 0) setFocus('nowPlaying', index - 1);
    } else if (section === 'nowPlayingQueue') {
      setFocus('nowPlaying', 7);
    } else if (section === 'nowPlayingQueue_remove') {
      setFocus('nowPlayingQueue', index);
    } else if (section.endsWith('_heart')) {
      const queueSection = section.replace('_heart', '_queue') as FocusSection;
      setFocus(queueSection, index);
    } else if (section.endsWith('_queue')) {
      const baseSection = section.replace('_queue', '') as FocusSection;
      setFocus(baseSection, index);
    } else if (section === 'search_mode') {
      if (index === 1) setFocus('search_mode', 0);
    } else if (section === 'search_kbd') {
      if (index < 24) {
        if (index % 6 > 0) setFocus('search_kbd', index - 1);
      } else {
        if (index > 24) setFocus('search_kbd', index - 1);
      }
    } else if (section === 'search_tabs') {
      if (index === 1) {
        setFocus('search_tabs', 0);
      } else {
        setFocus('search_mode', 1);
      }
    } else if (section === 'search_results' || section === 'search') {
      const elem = document.querySelector(`[data-section="${section}"][data-index="${index}"]`);
      const isList = elem?.getAttribute('data-variant') === 'list';
      if (isList) {
        setFocus('search_kbd', 17);
      } else {
        if (index % 3 === 0) {
          const kbdRow = Math.min(Math.floor(index / 3), 4);
          const targetKbdIndex = kbdRow === 4 ? 28 : kbdRow * 6 + 5;
          setFocus('search_kbd', targetKbdIndex);
        } else {
          setFocus(section as FocusSection, index - 1);
        }
      }
    } else if (section === 'settingsModal') {
      if (index > 0) setFocus('settingsModal', index - 1);
    } else if (section === 'exitConfirm') {
      if (index > 0) setFocus('exitConfirm', index - 1);
    } else if (section === 'albumFilters') {
      if (index > 0) setFocus('albumFilters', index - 1);
    }
  }

  function handleRight(section: FocusSection, index: number, totalCount: number) {
    if (section === 'topBar') {
      if (index < totalCount - 1) setFocus('topBar', index + 1);
    } else if (section === 'grid') {
      if (activeTab() === 'home') {
        const rows = getHomeRowRanges();
        const curRowIdx = rows.findIndex((r) => index >= r.start && index < r.start + r.count);
        if (curRowIdx >= 0) {
          const curRow = rows[curRowIdx];
          if (index < curRow.start + curRow.count - 1) {
            setFocus('grid', index + 1);
          } else if (curRowIdx < rows.length - 1) {
            const nextRow = rows[curRowIdx + 1];
            setFocus('grid', nextRow.start);
          }
        }
      } else {
        if (index < totalCount - 1) setFocus('grid', index + 1);
      }
    } else if (section === 'albumDetail') {
      const trackStartAttr = document.querySelector('[data-track-start]')?.getAttribute('data-track-start');
      const trackStart = trackStartAttr ? parseInt(trackStartAttr, 10) : 4;
      const queueBtn = document.querySelector(`[data-section="albumDetail_queue"][data-index="${index}"]`);
      if (queueBtn) {
        setFocus('albumDetail_queue' as FocusSection, index);
      } else if (index < trackStart - 1) {
        setFocus('albumDetail', index + 1);
      }
    } else if (section === 'nowPlaying') {
      if (index === 7) {
        const queueElem = document.querySelector('[data-section="nowPlayingQueue"]');
        if (queueElem) setFocus('nowPlayingQueue', 0);
      } else if (index < totalCount - 1) {
        setFocus('nowPlaying', index + 1);
      }
    } else if (section === 'nowPlayingQueue') {
      const removeBtn = document.querySelector(`[data-section="nowPlayingQueue_remove"][data-index="${index}"]`);
      if (removeBtn) {
        setFocus('nowPlayingQueue_remove' as FocusSection, index);
      } else {
        setFocus('nowPlaying', 7);
      }
    } else if (section === 'nowPlayingQueue_remove') {
      setFocus('nowPlaying', 7);
    } else if (section.endsWith('_queue')) {
      const heartSection = section.replace('_queue', '_heart') as FocusSection;
      const heartBtn = document.querySelector(`[data-section="${heartSection}"][data-index="${index}"]`);
      if (heartBtn) {
        setFocus(heartSection, index);
      } else {
        const baseSection = section.replace('_queue', '') as FocusSection;
        setFocus(baseSection, index);
      }
    } else if (section.endsWith('_heart')) {
      const baseSection = section.replace('_heart', '') as FocusSection;
      setFocus(baseSection, index);
    } else if (section === 'search_mode') {
      if (index === 0) {
        setFocus('search_mode', 1);
      } else {
        const tabsBtn = document.querySelector('[data-section="search_tabs"]');
        const resBtn = document.querySelector('[data-section="search_results"]');
        if (tabsBtn) setFocus('search_tabs', 0);
        else if (resBtn) setFocus('search_results', 0);
      }
    } else if (section === 'search_kbd') {
      const isRightEdge = index < 24 ? index % 6 === 5 : index === 28;
      if (!isRightEdge) {
        setFocus('search_kbd', index + 1);
      } else {
        const resBtn = document.querySelector('[data-section="search_results"]');
        const tabsBtn = document.querySelector('[data-section="search_tabs"]');
        if (resBtn) {
          const kbdRow = Math.min(Math.floor(index / 6), 4);
          const resTotal = document.querySelectorAll('[data-section="search_results"]').length;
          const targetResIndex = Math.min(kbdRow * 3, Math.max(0, resTotal - 1));
          setFocus('search_results', targetResIndex);
        } else if (tabsBtn) {
          setFocus('search_tabs', 0);
        }
      }
    } else if (section === 'search_tabs') {
      if (index === 0) setFocus('search_tabs', 1);
    } else if (section === 'search_results' || section === 'search') {
      const queueBtn = document.querySelector(`[data-section="${section}_queue"][data-index="${index}"]`);
      if (queueBtn) {
        setFocus(`${section}_queue` as FocusSection, index);
      } else {
        const elem = document.querySelector(`[data-section="${section}"][data-index="${index}"]`);
        const isList = elem?.getAttribute('data-variant') === 'list';
        if (!isList && index % 3 < 2 && index < totalCount - 1) {
          setFocus(section as FocusSection, index + 1);
        }
      }
    } else if (section === 'settingsModal') {
      if (index < totalCount - 1) setFocus('settingsModal', index + 1);
    } else if (section === 'exitConfirm') {
      if (index < totalCount - 1) setFocus('exitConfirm', index + 1);
    } else if (section === 'albumFilters') {
      if (index < totalCount - 1) setFocus('albumFilters', index + 1);
    }
  }

  function handleBack() {
    const modal = activeModal();
    if (modal === 'exitConfirm') {
      cancelExit();
      return;
    }
    if (modal === 'settingsServer' || modal === 'settingsAccount') {
      setActiveModal('none');
      setFocus('settings', modal === 'settingsServer' ? 0 : 2);
      return;
    }
    if (currentLocation().section === 'nowPlayingQueue') {
      setFocus('nowPlaying', 7);
      return;
    }
    if (modal === 'nowPlaying') {
      if (selectedAlbumId()) {
        setActiveModal('albumDetail');
        setFocus('albumDetail', 1);
      } else {
        setActiveModal('none');
        setFocus('grid', 0);
      }
      return;
    }
    if (modal === 'albumDetail') {
      setActiveModal('none');
      setFocus('topBar', getTopBarIndexFromTab(activeTab()));
      return;
    }

    if (
      currentLocation().section === 'grid' ||
      currentLocation().section === 'albumFilters' ||
      currentLocation().section === 'search' ||
      currentLocation().section === 'search_mode' ||
      currentLocation().section === 'search_kbd' ||
      currentLocation().section === 'search_tabs' ||
      currentLocation().section === 'search_results' ||
      currentLocation().section === 'settings'
    ) {
      setFocus('topBar', getTopBarIndexFromTab(activeTab()));
      return;
    }

    if (currentLocation().section === 'topBar') {
      if (activeTab() !== 'home') {
        setActiveTab('home');
        setFocus('grid', 0);
        return;
      }

      setActiveModal('exitConfirm');
      setFocus('exitConfirm', 0);
      return;
    } else if (modal === 'setup') {
      if (typeof window !== 'undefined' && window.close) {
        window.close();
      }
    }
  }

  function triggerClickAt(section: FocusSection, index: number) {
    const selector = `[data-focusable="true"][data-section="${section}"][data-index="${index}"]`;
    const target = document.querySelector(selector) as HTMLElement | null;
    if (target) {
      if (target.tagName === 'INPUT') {
        target.focus();
      }
      target.click();
    }
  }

  function setTab(tab: 'home' | 'albums' | 'playlists' | 'nowPlaying' | 'search' | 'settings') {
    cachedHomeRowRanges = null;
    setActiveTab(tab);
  }

  function setModal(modal: 'none' | 'nowPlaying' | 'albumDetail' | 'settingsServer' | 'settingsAccount' | 'exitConfirm') {
    cachedHomeRowRanges = null;
    setActiveModal(modal);
  }

  function exitApp() {
    console.log('Cleanly exiting webOS app...');
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    }
  }

  function cancelExit() {
    setActiveModal('none');
    setFocus('topBar', 0);
  }

  function setupPointerListeners() {
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest('[data-focusable="true"]') as HTMLElement | null;
      if (target) {
        const sec = target.getAttribute('data-section') as FocusSection | null;
        const idxStr = target.getAttribute('data-index');
        if (sec && idxStr !== null) {
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx)) {
            const loc = currentLocation();
            if (loc.section === sec && loc.index === idx) return;
            setFocus(sec, idx, true);
          }
        }
      }
    });
  }

  return {
    currentLocation,
    activeTab,
    setActiveTab: setTab,
    activeModal,
    setActiveModal: setModal,
    selectedAlbumId,
    setSelectedAlbumId,
    setFocus,
    setGridColumns,
    handleKeyDown,
    handleKeyUp,
    setupPointerListeners,
    syncDOMFocus,
    exitApp,
    cancelExit,
  };
}

export const focusEngine = createRoot(createFocusEngine);
