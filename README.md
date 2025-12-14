# React Native Audio Kit 🎵

![React Native Audio Kit Banner](react-native-audio-kit-banner.png)

A powerful, production-ready audio library for React Native. Built with **ExoPlayer (Media3)** on Android and **AVPlayer** on iOS.

[![npm version](https://img.shields.io/npm/v/react-native-audio-kit.svg)](https://www.npmjs.com/package/react-native-audio-kit)
[![Platform](https://img.shields.io/badge/platform-ios%20%7C%20android-blue.svg)](https://files.reactnative.dev)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

### Core Features

- ⚡ **New Architecture**: Full TurboModules & Fabric support (RN 0.74+)
- 🎧 **Playback Controls**: Play, Pause, Seek, Volume, Rate, Loop
- 🎙️ **Recording**: High-quality audio recording with format options (AAC, WAV, MP3)
- 📱 **Lock Screen**: Media controls and artwork on notification/lock screen
- 🔒 **Background Mode**: Continues playing when app is backgrounded

### Advanced Features

- 🎚️ **Equalizer**: 5-band audio equalizer for sound customization
- 💾 **Cache Management**: Offline playback with configurable caching
- 🔄 **Network Resilience**: Retry logic and buffering controls
- 📊 **Quality Presets**: Easy recording configuration (low/medium/high)
- 🪝 **React Hooks**: `useAudioPlayer` for seamless integration
- 📚 **Media Library**: Access device audio files with search

> 📘 **Full Documentation**: Check out the [User Guide & API Reference](USER_GUIDE.md) for detailed instructions.

---

## 📦 Installation

```bash
npm install react-native-audio-kit
# or
yarn add react-native-audio-kit
```

### iOS Setup

```bash
cd ios && pod install
```

Add to `Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to record audio</string>
<key>NSAppleMusicUsageDescription</key>
<string>We need access to your music library</string>
```

### Android Setup

Permissions are handled automatically. For media library access, request permissions at runtime:

```typescript
import { PermissionsAndroid, Platform } from "react-native";

async function requestAudioPermission() {
  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}
```

---

## 🚀 Quick Start

### 1. Simple Audio Playback

```typescript
import React from "react";
import { View, Button, Text } from "react-native";
import { useAudioPlayer } from "react-native-audio-kit";

function SimplePlayer() {
  const { state, position, duration, play, pause, seek } = useAudioPlayer(
    "https://example.com/song.mp3",
    {
      autoDestroy: true,
      loop: false,
    }
  );

  return (
    <View style={{ padding: 20 }}>
      <Text>Status: {state}</Text>
      <Text>
        {position.toFixed(1)}s / {duration.toFixed(1)}s
      </Text>

      <Button title="Play" onPress={play} />
      <Button title="Pause" onPress={pause} />

      {/* Seek to 30 seconds */}
      <Button title="Skip to 30s" onPress={() => seek(30)} />
    </View>
  );
}
```

### 2. Complete Music Player with Playlist

```typescript
import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, Text } from "react-native";
import { AudioQueue, getAllAudios, AudioAsset } from "react-native-audio-kit";

function MusicPlayer() {
  const [queue] = useState(() => new AudioQueue());
  const [songs, setSongs] = useState<AudioAsset[]>([]);
  const [currentSong, setCurrentSong] = useState<AudioAsset | null>(null);

  useEffect(() => {
    // Load device music library
    getAllAudios().then(setSongs);

    // Listen to queue changes
    const unsubscribe = queue.onChange((list, current) => {
      setCurrentSong(current);
    });

    return () => {
      unsubscribe();
      queue.destroy();
    };
  }, []);

  const playSong = (index: number) => {
    queue.playList(songs, index);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Now Playing */}
      <View style={{ padding: 20, backgroundColor: "#f0f0f0" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          {currentSong?.title || "No song playing"}
        </Text>
        <Text>{currentSong?.artist || ""}</Text>

        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <Button title="⏮️ Prev" onPress={() => queue.prev()} />
          <Button title="⏭️ Next" onPress={() => queue.next()} />
        </View>
      </View>

      {/* Song List */}
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => playSong(index)}
            style={{
              padding: 15,
              borderBottomWidth: 1,
              backgroundColor:
                currentSong?.id === item.id ? "#e3f2fd" : "white",
            }}
          >
            <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
            <Text style={{ color: "#666" }}>{item.artist}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

### 3. Audio Recording with Quality Presets

```typescript
import React, { useState } from "react";
import { View, Button, Text } from "react-native";
import { AudioRecorder } from "react-native-audio-kit";
import RNFS from "react-native-fs";

function VoiceRecorder() {
  const [recorder] = useState(() => new AudioRecorder());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPath, setRecordingPath] = useState("");

  const startRecording = async () => {
    const path = `${RNFS.DocumentDirectoryPath}/recording_${Date.now()}.aac`;

    await recorder.prepare(path, {
      quality: "high", // 'low' | 'medium' | 'high'
      format: "aac",
    });

    await recorder.start();
    setIsRecording(true);
    setRecordingPath(path);
  };

  const stopRecording = async () => {
    const finalPath = await recorder.stop();
    setIsRecording(false);
    console.log("Recording saved to:", finalPath);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Status: {isRecording ? "🔴 Recording..." : "⏹️ Stopped"}</Text>

      {!isRecording ? (
        <Button title="Start Recording" onPress={startRecording} />
      ) : (
        <Button title="Stop Recording" onPress={stopRecording} />
      )}

      {recordingPath && (
        <Text style={{ marginTop: 10 }}>Saved: {recordingPath}</Text>
      )}
    </View>
  );
}
```

### 4. Audio Equalizer

```typescript
import React, { useEffect, useState } from "react";
import { View, Text, Slider } from "react-native";
import { AudioPlayer } from "react-native-audio-kit";

function EqualizerDemo() {
  const [player] = useState(
    () => new AudioPlayer("https://example.com/song.mp3")
  );
  const [bands, setBands] = useState<
    Array<{ frequency: number; gain: number }>
  >([]);

  useEffect(() => {
    const setup = async () => {
      await player.prepare();
      await player.enableEqualizer(true);
      const eqBands = await player.getEqualizerBands();
      setBands(eqBands);
      await player.play();
    };

    setup();
    return () => player.destroy();
  }, []);

  const updateBand = async (index: number, gain: number) => {
    await player.setEqualizerBand(index, gain);
    setBands((prev) => prev.map((b, i) => (i === index ? { ...b, gain } : b)));
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Audio Equalizer</Text>

      {bands.map((band, index) => (
        <View key={index} style={{ marginBottom: 15 }}>
          <Text>
            {band.frequency} Hz: {band.gain.toFixed(1)} dB
          </Text>
          <Slider
            minimumValue={-15}
            maximumValue={15}
            value={band.gain}
            onSlidingComplete={(value) => updateBand(index, value)}
            step={0.5}
          />
        </View>
      ))}
    </View>
  );
}
```

### 5. Cache Management for Offline Playback

```typescript
import React, { useEffect, useState } from "react";
import { View, Button, Text } from "react-native";
import { CacheManager, AudioPlayer } from "react-native-audio-kit";

function OfflinePlayer() {
  const [cacheStatus, setCacheStatus] = useState({
    sizeBytes: 0,
    itemCount: 0,
  });
  const [player] = useState(
    () =>
      new AudioPlayer("https://example.com/song.mp3", {
        cache: {
          enabled: true,
          maxSizeBytes: 100 * 1024 * 1024, // 100MB
        },
      })
  );

  useEffect(() => {
    // Configure cache on mount
    CacheManager.setCacheConfig({
      maxSizeBytes: 100 * 1024 * 1024,
      enabled: true,
    });

    // Check cache status
    updateCacheStatus();
  }, []);

  const updateCacheStatus = async () => {
    const status = await CacheManager.getCacheStatus();
    setCacheStatus(status);
  };

  const clearCache = async () => {
    await CacheManager.clearCache();
    updateCacheStatus();
  };

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Cache Status</Text>
      <Text>Size: {formatBytes(cacheStatus.sizeBytes)}</Text>
      <Text>Items: {cacheStatus.itemCount}</Text>

      <Button title="Refresh Status" onPress={updateCacheStatus} />
      <Button title="Clear Cache" onPress={clearCache} color="red" />

      <View style={{ marginTop: 20 }}>
        <Button title="Play (will cache)" onPress={() => player.play()} />
      </View>
    </View>
  );
}
```

---

## 📚 API Overview

### Classes

| Class           | Purpose               | Key Methods                                               |
| --------------- | --------------------- | --------------------------------------------------------- |
| `AudioPlayer`   | Single track playback | `play()`, `pause()`, `seek()`, `setVolume()`, `setRate()` |
| `AudioQueue`    | Playlist management   | `playList()`, `next()`, `prev()`, `add()`                 |
| `AudioRecorder` | Audio recording       | `prepare()`, `start()`, `stop()`, `pause()`               |
| `CacheManager`  | Cache management      | `setCacheConfig()`, `getCacheStatus()`, `clearCache()`    |

### Hooks

| Hook                           | Purpose                 | Returns                                                 |
| ------------------------------ | ----------------------- | ------------------------------------------------------- |
| `useAudioPlayer(url, options)` | React hook for playback | `{ state, position, duration, play, pause, seek, ... }` |

### Helpers

| Function              | Purpose                  | Returns                 |
| --------------------- | ------------------------ | ----------------------- |
| `getAllAudios()`      | Fetch device audio files | `Promise<AudioAsset[]>` |
| `getAlbums()`         | Group files by album     | `Promise<Album[]>`      |
| `searchAudios(query)` | Search audio files       | `Promise<AudioAsset[]>` |

---

## 🎯 Common Use Cases

### Streaming Radio/Podcast

```typescript
const player = new AudioPlayer("https://stream.example.com/radio.mp3", {
  network: {
    retryCount: 5,
    retryDelay: 2000,
    bufferDuration: 15,
  },
});

await player.prepare();
await player.play();
```

### Background Music Player

```typescript
const player = new AudioPlayer("song.mp3", {
  continuesToPlayInBackground: true,
  loop: false,
});

await player.prepare();
await player.setupNotification({
  title: "My Song",
  artist: "Artist Name",
  artwork: "https://example.com/cover.jpg",
  hasNext: true,
  hasPrevious: true,
});

await player.play();
```

### Voice Memo App

```typescript
const recorder = new AudioRecorder();

// Start recording
await recorder.prepare("/path/to/memo.aac", {
  quality: "medium",
  format: "aac",
});
await recorder.start();

// Monitor audio levels
recorder.onMetering((db) => {
  console.log("Audio level:", db);
});

// Stop and save
const savedPath = await recorder.stop();
```

---

## 📖 Documentation

- **[User Guide](USER_GUIDE.md)** - Comprehensive API documentation with examples
- **[Roadmap](ROADMAP.md)** - Feature status and future plans

---

## 🔧 Requirements

- React Native >= 0.74.0
- iOS >= 11.0
- Android >= 5.0 (API 21)

---

## 📄 License

MIT © [Haris Khalid](https://github.com/hariskhalid366)

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

**Repository**: [github.com/hariskhalid366/react-native-audio-kit](https://github.com/hariskhalid366/react-native-audio-kit)

---

**Made with ❤️ for the React Native community**
