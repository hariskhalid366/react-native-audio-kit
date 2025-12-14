# User Guide: react-native-audio-kit

This guide provides comprehensive documentation with practical code examples for every feature in `react-native-audio-kit`.

## Table of Contents

1. [Getting Started](#getting-started)
2. [AudioPlayer](#audioplayer)
3. [AudioQueue](#audioqueue)
4. [AudioRecorder](#audiorecorder)
5. [Audio Equalizer](#audio-equalizer)
6. [Cache Management](#cache-management)
7. [Media Library](#media-library)
8. [React Hooks](#react-hooks)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

```bash
npm install react-native-audio-kit
cd ios && pod install
```

### Basic Import

```typescript
import {
  AudioPlayer,
  AudioQueue,
  AudioRecorder,
  CacheManager,
  useAudioPlayer,
  getAllAudios,
} from "react-native-audio-kit";
```

---

## AudioPlayer

The `AudioPlayer` class provides complete control over single-track audio playback.

### Creating a Player

```typescript
import { AudioPlayer } from "react-native-audio-kit";

// Local file
const player = new AudioPlayer("file:///path/to/song.mp3");

// Remote URL
const player = new AudioPlayer("https://example.com/song.mp3");

// With options
const player = new AudioPlayer("https://example.com/song.mp3", {
  autoDestroy: true,
  continuesToPlayInBackground: true,
  loop: false,
  volume: 0.8,
  rate: 1.0,
});
```

### Basic Playback Control

```typescript
// Prepare the player (required before play)
await player.prepare();

// Play
await player.play();

// Pause
await player.pause();

// Stop and reset to beginning
await player.stop();

// Seek to 30 seconds
await player.seek(30);

// Set volume (0.0 to 1.0)
await player.setVolume(0.5);

// Set playback rate (0.5 to 2.0)
await player.setRate(1.5); // 1.5x speed

// Clean up when done
player.destroy();
```

### Listening to Events

```typescript
// State changes
const unsubscribeState = player.onStateChange((state) => {
  console.log("Player state:", state);
  // 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended'
});

// Progress updates (every 500ms while playing)
const unsubscribeProgress = player.onProgress((position, duration) => {
  console.log(`${position}s / ${duration}s`);
  const percentage = (position / duration) * 100;
  console.log(`Progress: ${percentage.toFixed(1)}%`);
});

// Errors
const unsubscribeError = player.onError((code, message) => {
  console.error("Playback error:", code, message);
});

// Audio interruptions (headphones unplugged, phone call, etc.)
const unsubscribeInterruption = player.onInterruption((reason) => {
  console.log("Interrupted:", reason); // 'noisy' | 'call' | 'duck'
});

// Clean up listeners
unsubscribeState();
unsubscribeProgress();
unsubscribeError();
unsubscribeInterruption();
```

### Lock Screen / Notification Controls

```typescript
await player.prepare();

// Setup notification with controls
await player.setupNotification({
  title: "Song Title",
  artist: "Artist Name",
  artwork: "https://example.com/cover.jpg",
  hasNext: true,
  hasPrevious: false,
});

await player.play();
```

### Complete Example: Music Player Component

```typescript
import React, { useEffect, useState } from "react";
import { View, Button, Text, Slider } from "react-native";
import { AudioPlayer, PlaybackState } from "react-native-audio-kit";

function MusicPlayerComponent({ songUrl }: { songUrl: string }) {
  const [player] = useState(() => new AudioPlayer(songUrl));
  const [state, setState] = useState<PlaybackState>(PlaybackState.Idle);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Setup player
    player.prepare();

    // Subscribe to events
    const unsubs = [
      player.onStateChange(setState),
      player.onProgress((pos, dur) => {
        setPosition(pos);
        setDuration(dur);
      }),
    ];

    // Cleanup
    return () => {
      unsubs.forEach((fn) => fn());
      player.destroy();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Status: {state}</Text>

      <Text>
        {formatTime(position)} / {formatTime(duration)}
      </Text>

      <Slider
        value={position}
        minimumValue={0}
        maximumValue={duration}
        onSlidingComplete={(value) => player.seek(value)}
        style={{ marginVertical: 20 }}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        <Button
          title="⏮️ -10s"
          onPress={() => player.seek(Math.max(0, position - 10))}
        />
        <Button
          title={state === PlaybackState.Playing ? "⏸️ Pause" : "▶️ Play"}
          onPress={() =>
            state === PlaybackState.Playing ? player.pause() : player.play()
          }
        />
        <Button
          title="⏭️ +10s"
          onPress={() => player.seek(Math.min(duration, position + 10))}
        />
      </View>
    </View>
  );
}
```

---

## AudioQueue

The `AudioQueue` class manages playlists with automatic transitions and lock screen integration.

### Creating and Using a Queue

```typescript
import { AudioQueue, getAllAudios } from "react-native-audio-kit";

const queue = new AudioQueue();

// Load songs from device
const songs = await getAllAudios();

// Play the entire list starting from index 0
await queue.playList(songs, 0);

// Navigation
await queue.next(); // Skip to next track
await queue.prev(); // Go to previous track

// Add more songs to the queue
queue.add(moreSongs);

// Get current state
const currentTrack = queue.getCurrentTrack();
const allTracks = queue.getQueue();
```

### Listening to Queue Changes

```typescript
const unsubscribe = queue.onChange((queueList, currentTrack) => {
  console.log("Queue updated");
  console.log("Now playing:", currentTrack?.title);
  console.log("Total tracks:", queueList.length);

  // Update UI
  setCurrentSong(currentTrack);
  setPlaylist(queueList);
});

// Clean up
unsubscribe();
queue.destroy();
```

### Complete Example: Playlist Manager

```typescript
import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, Text, Button } from "react-native";
import { AudioQueue, getAllAudios, AudioAsset } from "react-native-audio-kit";

function PlaylistManager() {
  const [queue] = useState(() => new AudioQueue());
  const [songs, setSongs] = useState<AudioAsset[]>([]);
  const [currentSong, setCurrentSong] = useState<AudioAsset | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    // Load music library
    loadSongs();

    // Listen to queue changes
    const unsubscribe = queue.onChange((list, current) => {
      setCurrentSong(current);
      const index = list.findIndex((s) => s.id === current?.id);
      setCurrentIndex(index);
    });

    return () => {
      unsubscribe();
      queue.destroy();
    };
  }, []);

  const loadSongs = async () => {
    const deviceSongs = await getAllAudios();
    setSongs(deviceSongs);
  };

  const playSong = (index: number) => {
    queue.playList(songs, index);
  };

  const renderSongItem = ({
    item,
    index,
  }: {
    item: AudioAsset;
    index: number;
  }) => {
    const isPlaying = currentIndex === index;

    return (
      <TouchableOpacity
        onPress={() => playSong(index)}
        style={{
          padding: 15,
          backgroundColor: isPlaying ? "#e3f2fd" : "white",
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {isPlaying && <Text style={{ marginRight: 10 }}>▶️</Text>}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              {item.title}
            </Text>
            <Text style={{ color: "#666", marginTop: 4 }}>
              {item.artist} • {item.album}
            </Text>
            <Text style={{ color: "#999", fontSize: 12, marginTop: 2 }}>
              {Math.floor(item.duration / 60)}:
              {Math.floor(item.duration % 60)
                .toString()
                .padStart(2, "0")}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Now Playing Bar */}
      <View style={{ padding: 15, backgroundColor: "#1976d2" }}>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
          {currentSong?.title || "No song playing"}
        </Text>
        <Text style={{ color: "#bbdefb", marginTop: 4 }}>
          {currentSong?.artist || ""}
        </Text>

        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
            justifyContent: "space-around",
          }}
        >
          <Button
            title="⏮️ Previous"
            onPress={() => queue.prev()}
            color="white"
          />
          <Button title="⏭️ Next" onPress={() => queue.next()} color="white" />
        </View>
      </View>

      {/* Song List */}
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderSongItem}
        ListEmptyComponent={
          <Text style={{ padding: 20, textAlign: "center", color: "#999" }}>
            No songs found. Make sure you've granted media permissions.
          </Text>
        }
      />
    </View>
  );
}
```

---

## AudioRecorder

Record high-quality audio with flexible configuration options.

### Basic Recording

```typescript
import { AudioRecorder } from "react-native-audio-kit";
import RNFS from "react-native-fs";

const recorder = new AudioRecorder();

// Prepare with quality preset
const path = `${RNFS.DocumentDirectoryPath}/recording.aac`;
await recorder.prepare(path, {
  quality: "high", // 'low' | 'medium' | 'high'
  format: "aac", // 'aac' | 'wav' | 'mp3'
});

// Start recording
await recorder.start();

// Stop and get file path
const savedPath = await recorder.stop();
console.log("Recording saved to:", savedPath);
```

### Advanced Recording Configuration

```typescript
// Manual configuration for fine control
await recorder.prepare(path, {
  format: "aac",
  sampleRate: 48000, // Hz
  channels: 2, // 1 = mono, 2 = stereo
  bitrate: 192000, // bits per second
  meteringEnabled: true, // Enable audio level monitoring
});
```

### Audio Level Monitoring

```typescript
// Monitor audio levels during recording
recorder.onMetering((decibels) => {
  console.log("Audio level:", decibels, "dB");

  // Update UI with audio level indicator
  const normalized = Math.max(0, Math.min(100, (decibels + 60) * 1.67));
  setAudioLevel(normalized);
});
```

### Complete Example: Voice Recorder

```typescript
import React, { useState } from "react";
import { View, Button, Text, ProgressBar } from "react-native";
import { AudioRecorder } from "react-native-audio-kit";
import RNFS from "react-native-fs";

function VoiceRecorder() {
  const [recorder] = useState(() => new AudioRecorder());
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [savedPath, setSavedPath] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      // Update recording time
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Monitor audio levels
      recorder.onMetering((db) => {
        const level = Math.max(0, Math.min(100, (db + 60) * 1.67));
        setAudioLevel(level);
      });
    }

    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    const path = `${RNFS.DocumentDirectoryPath}/voice_${Date.now()}.aac`;

    await recorder.prepare(path, {
      quality: "medium",
      format: "aac",
      meteringEnabled: true,
    });

    await recorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    setSavedPath("");
  };

  const stopRecording = async () => {
    const path = await recorder.stop();
    setIsRecording(false);
    setSavedPath(path);
    setAudioLevel(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, textAlign: "center", marginBottom: 20 }}>
        {isRecording ? "🔴 Recording" : "⏹️ Ready"}
      </Text>

      {isRecording && (
        <>
          <Text style={{ fontSize: 32, textAlign: "center", marginBottom: 10 }}>
            {formatTime(recordingTime)}
          </Text>

          <View style={{ marginBottom: 20 }}>
            <Text>Audio Level:</Text>
            <ProgressBar progress={audioLevel / 100} color="#4caf50" />
          </View>
        </>
      )}

      {!isRecording ? (
        <Button title="🎙️ Start Recording" onPress={startRecording} />
      ) : (
        <Button title="⏹️ Stop Recording" onPress={stopRecording} color="red" />
      )}

      {savedPath && (
        <View
          style={{ marginTop: 20, padding: 10, backgroundColor: "#e8f5e9" }}
        >
          <Text style={{ fontWeight: "bold" }}>Recording Saved!</Text>
          <Text style={{ fontSize: 12, marginTop: 5 }}>{savedPath}</Text>
        </View>
      )}
    </View>
  );
}
```

---

## Audio Equalizer

Customize audio output with a 5-band equalizer.

### Basic Equalizer Usage

```typescript
const player = new AudioPlayer("song.mp3");
await player.prepare();

// Enable equalizer
await player.enableEqualizer(true);

// Get available bands
const bands = await player.getEqualizerBands();
// Returns: [{frequency: 60, gain: 0}, {frequency: 230, gain: 0}, ...]

// Adjust individual bands (gain in dB, range: -15 to +15)
await player.setEqualizerBand(0, 8.0); // Boost bass
await player.setEqualizerBand(4, -3.0); // Cut treble
```

### Equalizer Presets

```typescript
// Bass Boost
async function applyBassBoost(player: AudioPlayer) {
  await player.enableEqualizer(true);
  await player.setEqualizerBand(0, 8.0); // 60 Hz
  await player.setEqualizerBand(1, 5.0); // 230 Hz
  await player.setEqualizerBand(2, 0.0); // 910 Hz
  await player.setEqualizerBand(3, -2.0); // 3.6 kHz
  await player.setEqualizerBand(4, -4.0); // 14 kHz
}

// Treble Boost
async function applyTrebleBoost(player: AudioPlayer) {
  await player.enableEqualizer(true);
  await player.setEqualizerBand(0, -4.0); // 60 Hz
  await player.setEqualizerBand(1, -2.0); // 230 Hz
  await player.setEqualizerBand(2, 0.0); // 910 Hz
  await player.setEqualizerBand(3, 4.0); // 3.6 kHz
  await player.setEqualizerBand(4, 8.0); // 14 kHz
}

// Vocal Boost
async function applyVocalBoost(player: AudioPlayer) {
  await player.enableEqualizer(true);
  await player.setEqualizerBand(0, -3.0); // 60 Hz
  await player.setEqualizerBand(1, 0.0); // 230 Hz
  await player.setEqualizerBand(2, 6.0); // 910 Hz (vocal range)
  await player.setEqualizerBand(3, 4.0); // 3.6 kHz
  await player.setEqualizerBand(4, -2.0); // 14 kHz
}
```

### Complete Example: Equalizer UI

```typescript
import React, { useEffect, useState } from "react";
import { View, Text, Slider, Button } from "react-native";
import { AudioPlayer } from "react-native-audio-kit";

function EqualizerScreen({ player }: { player: AudioPlayer }) {
  const [bands, setBands] = useState<
    Array<{ frequency: number; gain: number }>
  >([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadBands();
  }, []);

  const loadBands = async () => {
    const eqBands = await player.getEqualizerBands();
    setBands(eqBands);
  };

  const toggleEqualizer = async () => {
    const newState = !enabled;
    await player.enableEqualizer(newState);
    setEnabled(newState);
  };

  const updateBand = async (index: number, gain: number) => {
    await player.setEqualizerBand(index, gain);
    setBands((prev) => prev.map((b, i) => (i === index ? { ...b, gain } : b)));
  };

  const resetEqualizer = async () => {
    for (let i = 0; i < bands.length; i++) {
      await player.setEqualizerBand(i, 0);
    }
    loadBands();
  };

  const bandLabels = ["Bass", "Low Mid", "Mid", "High Mid", "Treble"];

  return (
    <View style={{ padding: 20 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Equalizer</Text>
        <Button
          title={enabled ? "ON" : "OFF"}
          onPress={toggleEqualizer}
          color={enabled ? "#4caf50" : "#9e9e9e"}
        />
      </View>

      {bands.map((band, index) => (
        <View
          key={index}
          style={{ marginBottom: 20, opacity: enabled ? 1 : 0.5 }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontWeight: "bold" }}>
              {bandLabels[index]} ({band.frequency} Hz)
            </Text>
            <Text>{band.gain.toFixed(1)} dB</Text>
          </View>

          <Slider
            minimumValue={-15}
            maximumValue={15}
            value={band.gain}
            onSlidingComplete={(value) => updateBand(index, value)}
            step={0.5}
            disabled={!enabled}
            minimumTrackTintColor="#2196f3"
            maximumTrackTintColor="#ccc"
          />
        </View>
      ))}

      <Button title="Reset All" onPress={resetEqualizer} />
    </View>
  );
}
```

---

## Cache Management

Manage audio file caching for offline playback and improved performance.

### Configuring Cache

```typescript
import { CacheManager } from "react-native-audio-kit";

// Set cache configuration
await CacheManager.setCacheConfig({
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  enabled: true,
});

// Check cache status
const status = await CacheManager.getCacheStatus();
console.log(`Cache size: ${status.sizeBytes} bytes`);
console.log(`Cached items: ${status.itemCount}`);

// Clear cache
await CacheManager.clearCache();
```

### Using Cache with Player

```typescript
const player = new AudioPlayer("https://example.com/song.mp3", {
  cache: {
    enabled: true,
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
});

await player.prepare();
await player.play();
// File will be cached for offline playback
```

### Complete Example: Cache Manager UI

```typescript
import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import { CacheManager } from "react-native-audio-kit";

function CacheManagerScreen() {
  const [status, setStatus] = useState({ sizeBytes: 0, itemCount: 0 });
  const [cacheEnabled, setCacheEnabled] = useState(true);

  useEffect(() => {
    loadCacheStatus();
  }, []);

  const loadCacheStatus = async () => {
    const cacheStatus = await CacheManager.getCacheStatus();
    setStatus(cacheStatus);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const toggleCache = async () => {
    const newState = !cacheEnabled;
    await CacheManager.setCacheConfig({
      enabled: newState,
      maxSizeBytes: 100 * 1024 * 1024,
    });
    setCacheEnabled(newState);
  };

  const clearCache = () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear all cached audio files?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await CacheManager.clearCache();
            loadCacheStatus();
          },
        },
      ]
    );
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Cache Management
      </Text>

      <View
        style={{
          backgroundColor: "#f5f5f5",
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>Cache Size:</Text>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {formatBytes(status.sizeBytes)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>Cached Items:</Text>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {status.itemCount}
          </Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 16 }}>Status:</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: cacheEnabled ? "#4caf50" : "#f44336",
            }}
          >
            {cacheEnabled ? "Enabled" : "Disabled"}
          </Text>
        </View>
      </View>

      <Button
        title={cacheEnabled ? "Disable Cache" : "Enable Cache"}
        onPress={toggleCache}
        color={cacheEnabled ? "#f44336" : "#4caf50"}
      />

      <View style={{ marginTop: 10 }}>
        <Button title="Refresh Status" onPress={loadCacheStatus} />
      </View>

      <View style={{ marginTop: 10 }}>
        <Button title="Clear Cache" onPress={clearCache} color="#ff9800" />
      </View>
    </View>
  );
}
```

---

## Media Library

Access and search device audio files.

### Getting All Audio Files

```typescript
import { getAllAudios } from "react-native-audio-kit";

const songs = await getAllAudios();
// Returns: Array of AudioAsset objects
// Each contains: { id, uri, title, artist, album, duration, artwork }
```

### Searching Audio Files

```typescript
import { searchAudios } from "react-native-audio-kit";

const results = await searchAudios("love");
// Searches in title, artist, and album fields
```

### Getting Albums

```typescript
import { getAlbums } from "react-native-audio-kit";

const albums = await getAlbums();
// Returns: Array of Album objects
// Each contains: { name, artist, artwork, songs: AudioAsset[] }
```

---

## React Hooks

### useAudioPlayer Hook

Simplified React hook for audio playback in functional components.

```typescript
import { useAudioPlayer } from "react-native-audio-kit";

function MyComponent() {
  const {
    player, // AudioPlayer instance
    state, // Current playback state
    position, // Current position in seconds
    duration, // Total duration in seconds
    play, // Play function
    pause, // Pause function
    stop, // Stop function
    seek, // Seek function
  } = useAudioPlayer("https://example.com/song.mp3", {
    autoDestroy: true,
    loop: false,
  });

  return (
    <View>
      <Text>{state}</Text>
      <Text>
        {position} / {duration}
      </Text>
      <Button title="Play" onPress={play} />
      <Button title="Pause" onPress={pause} />
    </View>
  );
}
```

---

## Troubleshooting

### Audio Stops in Background

**iOS**: Add `audio` to `UIBackgroundModes` in `Info.plist`

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

**Android**: Ensure `FOREGROUND_SERVICE` permission (handled automatically by library)

### Notification Controls Not Working

- Always call `player.destroy()` when done
- Don't call `setupNotification()` manually if using `AudioQueue`
- Ensure only one player instance is active at a time

### Permission Errors

```typescript
// Android 13+
import { PermissionsAndroid } from "react-native";

const granted = await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
);

// iOS
// Add NSAppleMusicUsageDescription to Info.plist
```

### Build Errors

- **Android**: Ensure `minSdkVersion >= 23`
- **iOS**: Ensure `platform :ios, '11.0'` in Podfile
- Run `pod install` after installation

---

## API Reference Summary

### AudioPlayer Methods

- `prepare()`, `play()`, `pause()`, `stop()`, `seek(position)`
- `setVolume(volume)`, `setRate(rate)`, `setMetadata(metadata)`
- `setupNotification(config)`, `destroy()`
- `enableEqualizer(enabled)`, `setEqualizerBand(index, gain)`, `getEqualizerBands()`

### AudioQueue Methods

- `playList(tracks, index)`, `add(tracks)`
- `next()`, `prev()`
- `getCurrentTrack()`, `getQueue()`
- `onChange(callback)`, `destroy()`

### AudioRecorder Methods

- `prepare(path, options)`, `start()`, `stop()`
- `pause()`, `resume()`
- `onMetering(callback)`

### CacheManager Methods

- `setCacheConfig(config)`, `getCacheStatus()`, `clearCache()`

### Helper Functions

- `getAllAudios()`, `getAlbums()`, `searchAudios(query)`

---

For more examples and updates, visit our [GitHub repository](https://github.com/hariskhalid366/react-native-audio-kit).
