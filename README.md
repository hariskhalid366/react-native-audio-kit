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

## Installation

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
```

### Android Setup

Permissions are handled automatically. For media library access, request `READ_MEDIA_AUDIO` (Android 13+) or `READ_EXTERNAL_STORAGE` at runtime.

## Quick Start

### Playing Audio

```typescript
import { useAudioPlayer } from "react-native-audio-kit";

function PlayerScreen() {
  const { state, position, duration, play, pause, seek } = useAudioPlayer(
    "https://example.com/song.mp3"
  );

  return (
    <View>
      <Text>
        {state} - {position.toFixed(1)}s / {duration.toFixed(1)}s
      </Text>
      <Button title="Play" onPress={play} />
      <Button title="Pause" onPress={pause} />
    </View>
  );
}
```

### Audio Queue & Playlists

```typescript
import { AudioQueue, getAllAudios } from "react-native-audio-kit";

const queue = new AudioQueue();
const songs = await getAllAudios();

// Play playlist
queue.playList(songs, 0);

// Controls
queue.next();
queue.prev();

// Listen to changes
queue.onChange((list, current) => {
  console.log("Now playing:", current?.title);
});
```

### Recording Audio

```typescript
import { AudioRecorder } from "react-native-audio-kit";

const recorder = new AudioRecorder();

// Start recording with quality preset
await recorder.prepare("/path/to/recording.aac", {
  quality: "high", // 'low' | 'medium' | 'high'
  format: "aac",
});
await recorder.start();

// Stop and get file path
const filePath = await recorder.stop();
```

### Audio Equalizer

```typescript
import { AudioPlayer } from "react-native-audio-kit";

const player = new AudioPlayer("https://example.com/song.mp3");
await player.prepare();

// Enable equalizer
await player.enableEqualizer(true);

// Get available bands
const bands = await player.getEqualizerBands();
// [{frequency: 60, gain: 0}, {frequency: 230, gain: 0}, ...]

// Adjust bass (first band)
await player.setEqualizerBand(0, 5.0); // +5dB boost
```

### Cache Management

```typescript
import { CacheManager } from "react-native-audio-kit";

// Configure cache
await CacheManager.setCacheConfig({
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  enabled: true,
});

// Check cache status
const status = await CacheManager.getCacheStatus();
console.log(`Cache: ${status.sizeBytes} bytes, ${status.itemCount} items`);

// Clear cache
await CacheManager.clearCache();
```

## API Overview

### Classes

- **`AudioPlayer`**: Single track playback with full control
- **`AudioQueue`**: Playlist management with auto-transitions
- **`AudioRecorder`**: Audio recording with format options
- **`CacheManager`**: Cache configuration and management

### Hooks

- **`useAudioPlayer(url, options)`**: React hook for audio playback

### Helpers

- **`getAllAudios()`**: Fetch all device audio files
- **`getAlbums()`**: Group audio files by album
- **`searchAudios(query)`**: Search audio files

## Advanced Features

### Network Resilience

```typescript
const player = new AudioPlayer("https://example.com/stream.mp3", {
  network: {
    retryCount: 3,
    retryDelay: 1000,
    bufferDuration: 10,
  },
});
```

### Adaptive Streaming

HLS and DASH streams are supported natively:

```typescript
const player = new AudioPlayer("https://example.com/stream.m3u8");
await player.prepare();
await player.play();
```

## Documentation

- [User Guide](USER_GUIDE.md) - Detailed API documentation
- [Roadmap](ROADMAP.md) - Feature status and future plans

## Requirements

- React Native >= 0.74.0
- iOS >= 11.0
- Android >= 5.0 (API 21)

## License

MIT

---

**Made with ❤️ for the React Native community**
