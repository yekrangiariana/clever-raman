import re

with open('src/components/NowPlayingView.tsx', 'r') as f:
    content = f.read()

# 1. Update hasClear
content = content.replace(
    'const hasClear = createMemo(() => userQueue().length > 0);',
    'const hasClear = createMemo(() => userQueue().length > 0 || upcomingContext().length > 0);'
)

# 2. Update handleClearUserQueue to use clearQueue
old_clear = """  function handleClearUserQueue() {
    audioPlayer.clearUserQueue();
    setTimeout(() => {"""

new_clear = """  function handleClearUserQueue() {
    audioPlayer.clearQueue();
    setTimeout(() => {"""

content = content.replace(old_clear, new_clear)

# 3. Update handleRemoveContextItem
old_remove_ctx = """  function handleRemoveContextItem(relIdx: number, e: Event) {
    e.stopPropagation();
    const cq = contextQueue();
    const actualIdx = contextIndex() + 1 + relIdx;
    if (actualIdx >= 0 && actualIdx < cq.length) {
      audioPlayer.removeSongsFromQueue(new Set([cq[actualIdx].id]));
    }
  }"""

new_remove_ctx = """  function handleRemoveContextItem(relIdx: number, e: Event) {
    e.stopPropagation();
    const actualIdx = contextIndex() + 1 + relIdx;
    audioPlayer.removeFromContextQueueByIndex(actualIdx);
  }"""

content = content.replace(old_remove_ctx, new_remove_ctx)

# 4. Simplify the separator label
old_label = """              <Show when={userQueue().length > 0 && upcomingContext().length > 0}>
                <div class="flex items-center gap-4 my-3 px-3">
                  <div class="h-px bg-white/15 flex-1" />
                  <span class="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    Continuing from {track()?.album || track()?.artist || 'Collection'}
                  </span>
                  <div class="h-px bg-white/15 flex-1" />
                </div>
              </Show>"""

new_label = """              <Show when={userQueue().length > 0 && upcomingContext().length > 0}>
                <div class="flex items-center gap-4 my-3 px-3">
                  <div class="h-px bg-white/15 flex-1" />
                  <span class="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    Resuming
                  </span>
                  <div class="h-px bg-white/15 flex-1" />
                </div>
              </Show>"""

content = content.replace(old_label, new_label)

with open('src/components/NowPlayingView.tsx', 'w') as f:
    f.write(content)

print("NowPlayingView patch successful")
