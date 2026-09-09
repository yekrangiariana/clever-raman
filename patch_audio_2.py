import re

with open('src/services/audio.ts', 'r') as f:
    content = f.read()

# 1. Update previousTrack
old_prev = """  function previousTrack() {
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
    }"""

new_prev = """  function previousTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const history = playedHistory();
    const cq = contextQueue();

    if (history.length > 0) {
      const prevTrack = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setPlayedHistory(newHistory);

      const currTrack = currentTrack();
      if (currTrack) {
        const currCqIdx = cq.findIndex((s) => s.id === currTrack.id);
        if (currCqIdx === -1) {
          setUserQueue([currTrack, ...userQueue()]);
        }
      }

      const prevCqIdx = cq.findIndex((s) => s.id === prevTrack.id);
      if (prevCqIdx >= 0) {
        setContextIndex(prevCqIdx);
      } else {
        let lastContextIdx = -1;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          const idxInCq = cq.findIndex((s) => s.id === newHistory[i].id);
          if (idxInCq >= 0) {
            lastContextIdx = idxInCq;
            break;
          }
        }
        setContextIndex(lastContextIdx);
      }

      startPlaybackStream(prevTrack, true);
      return;
    }"""

content = content.replace(old_prev, new_prev)

# 2. Update playHistoryItem
old_history = """  function playHistoryItem(song: Song) {
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
  }"""

new_history = """  function playHistoryItem(song: Song) {
    const history = playedHistory();
    const hIdx = history.findIndex((s) => s.id === song.id);
    if (hIdx >= 0) {
      const newHistory = history.slice(0, hIdx);
      const tracksToRequeue = history.slice(hIdx + 1);
      setPlayedHistory(newHistory);

      const cq = contextQueue();
      const currTrack = currentTrack();

      const customTracksToRequeue = tracksToRequeue.filter((s) => cq.findIndex((x) => x.id === s.id) === -1);
      
      if (currTrack && cq.findIndex((s) => s.id === currTrack.id) === -1) {
        customTracksToRequeue.push(currTrack);
      }

      if (customTracksToRequeue.length > 0) {
        setUserQueue([...customTracksToRequeue, ...userQueue()]);
      }

      const prevCqIdx = cq.findIndex((s) => s.id === song.id);
      if (prevCqIdx >= 0) {
        setContextIndex(prevCqIdx);
      } else {
        let lastContextIdx = -1;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          const idxInCq = cq.findIndex((s) => s.id === newHistory[i].id);
          if (idxInCq >= 0) {
            lastContextIdx = idxInCq;
            break;
          }
        }
        setContextIndex(lastContextIdx);
      }

      startPlaybackStream(song, true);
    }
  }"""

content = content.replace(old_history, new_history)

# 3. Add removeFromContextQueueByIndex and modify clearQueue
# Find clearQueue
clear_old = """  function clearQueue() {
    clearUserQueue();
  }"""

clear_new = """  function clearQueue() {
    clearUserQueue();
    const cIdx = contextIndex();
    setContextQueue(contextQueue().slice(0, cIdx + 1));
  }

  function removeFromContextQueueByIndex(actualIdx: number) {
    const cq = contextQueue();
    if (actualIdx >= 0 && actualIdx < cq.length) {
      const newCq = [...cq];
      newCq.splice(actualIdx, 1);
      setContextQueue(newCq);
    }
  }"""

content = content.replace(clear_old, clear_new)

# 4. Add removeFromContextQueueByIndex to exports
exports_old = """    removeFromUserQueueByIndex,
    removeFromQueueBySongId,"""

exports_new = """    removeFromUserQueueByIndex,
    removeFromContextQueueByIndex,
    removeFromQueueBySongId,"""

content = content.replace(exports_old, exports_new)

with open('src/services/audio.ts', 'w') as f:
    f.write(content)

print("Audio patch 2 successful")
