import re

with open('src/services/audio.ts', 'r') as f:
    content = f.read()

# 1. Update startPlaybackStream signature and logic
content = content.replace(
    'function startPlaybackStream(track: Song) {\n    const prevTrack = currentTrack();\n    if (prevTrack && prevTrack.id !== track.id) {\n      recordHistory(prevTrack);\n    }',
    'function startPlaybackStream(track: Song, isRewind = false) {\n    const prevTrack = currentTrack();\n    if (prevTrack && prevTrack.id !== track.id && !isRewind) {\n      recordHistory(prevTrack);\n    }'
)

# 2. Update previousTrack
old_prev = """  function previousTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const cq = contextQueue();
    if (cq.length === 0) return;

    let prevIdx = contextIndex() - 1;
    if (prevIdx < 0) {
      if (repeatMode() === 'all') {
        prevIdx = cq.length - 1;
      } else {
        prevIdx = 0;
      }
    }
    setContextIndex(prevIdx);
    startPlaybackStream(cq[prevIdx]);
  }"""

new_prev = """  function previousTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const history = playedHistory();
    const currTrack = currentTrack();
    const cq = contextQueue();

    if (history.length > 0) {
      const prevTrack = history[history.length - 1];
      setPlayedHistory(history.slice(0, -1));

      const cIdx = contextIndex();
      
      if (currTrack && cq[cIdx]?.id === currTrack.id && cIdx > 0 && cq[cIdx - 1].id === prevTrack.id) {
        setContextIndex(cIdx - 1);
      } else {
        if (currTrack) {
          setUserQueue([currTrack, ...userQueue()]);
        }
      }

      startPlaybackStream(prevTrack, true);
      return;
    }

    if (cq.length === 0) return;
    let prevIdx = contextIndex() - 1;
    if (prevIdx < 0) {
      if (repeatMode() === 'all') {
        prevIdx = cq.length - 1;
      } else {
        prevIdx = 0;
        audio.currentTime = 0;
        return;
      }
    }
    setContextIndex(prevIdx);
    startPlaybackStream(cq[prevIdx], true);
  }"""

content = content.replace(old_prev, new_prev)

# 3. Update jumpToContextIndex
old_jump = """  function jumpToContextIndex(index: number) {
    const cq = contextQueue();
    if (index >= 0 && index < cq.length) {
      setContextIndex(index);
      startPlaybackStream(cq[index]);
    }
  }"""

new_jump = """  function jumpToContextIndex(index: number) {
    const cq = contextQueue();
    if (index >= 0 && index < cq.length) {
      const isRewind = index < contextIndex();
      
      if (isRewind) {
        const history = playedHistory();
        const targetSong = cq[index];
        const hIdx = history.findIndex((s) => s.id === targetSong.id);
        if (hIdx >= 0) {
          setPlayedHistory(history.slice(0, hIdx));
        }
      }
      
      setContextIndex(index);
      startPlaybackStream(cq[index], isRewind);
    }
  }"""

content = content.replace(old_jump, new_jump)

# 4. Add playHistoryItem
history_func = """  function playHistoryItem(song: Song) {
    const history = playedHistory();
    const hIdx = history.findIndex((s) => s.id === song.id);
    if (hIdx >= 0) {
      setPlayedHistory(history.slice(0, hIdx));
    }

    const cq = contextQueue();
    const cIdx = cq.findIndex((s) => s.id === song.id);

    if (cIdx >= 0) {
      setContextIndex(cIdx);
      startPlaybackStream(song, true);
    } else {
      const curr = currentTrack();
      if (curr) {
        setUserQueue([curr, ...userQueue()]);
      }
      startPlaybackStream(song, true);
    }
  }

  return {"""

content = content.replace("  return {", history_func)

# 5. Export playHistoryItem in return
content = content.replace("jumpToContextIndex,\n    toggleShuffle,", "jumpToContextIndex,\n    playHistoryItem,\n    toggleShuffle,")

with open('src/services/audio.ts', 'w') as f:
    f.write(content)

print("Patched audio.ts")
