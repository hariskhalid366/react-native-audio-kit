# User Guide: react-native-audio-kit

This guide provides detailed documentation for every class, function, and hook available in `react-native-audio-kit`.

## Table of Contents

1. [AudioPlayer](#audimport {
   AudioPlayer,
   AudioRecorder,
   AudioQueue,
   useAudioPlayer
   } from 'react-native-audio-kit';player)
2. [AudioRecorder](#audiorecorder)
3. [AudioQueue](#audioqueue)
4. [Hooks](#hooks-useaudioplayer)
5. [Media Library](#media-library-helpers)

---

## AudioPlayer

The `AudioPlayer` class is used for controlling audio playback of a single track.

### Constructor

```typescript
new AudioPlayer(url: string, options?: PlayerOptions)
```

- **url**: The absolute path (local `file://`) or remote URL (`http(s)://`) of the audio.
- **options**:
  - `autoDestroy` (boolean): If `true`, the player is automatically destroyed when playback ends. Default: `false`.
  - `continuesToPlayInBackground` (boolean): If `true`, audio continues in background (requires iOS UIBackgroundModes). Default: `false`.
  - `loop` (boolean): If `true`, repeats the track indefinitely. Default: `false`.
  - `volume` (number): Initial volume (0.0 to 1.0).

### Methods

#### `prepare(): Promise<void>`

Initializes the native player resources. Must be called before `play()`.

#### `play(): Promise<void>`

Starts or resumes playback.

#### `pause(): Promise<void>`

Pauses playback.

#### `stop(): Promise<void>`

Stops playback and rewinds to the beginning.

#### `seek(position: number): Promise<void>`

Seeks to a specific timestamp in seconds.

#### `setVolume(volume: number): Promise<void>`

Sets the volume.

- **volume**: Float between `0.0` (mute) and `1.0` (max).

#### `setRate(rate: number): Promise<void>`

Sets playback speed.

- **rate**: `1.0` is normal speed. Range typically `0.5` to `2.0`.

#### `setMetadata(metadata: AudioMetadata): Promise<void>`

Updates the Now Playing info on the Lock Screen (without queue logic).

- **metadata**: `{ title, artist, artwork, duration }`.

#### `setupNotification(config: NotificationConfig): Promise<void>`

Configures the Lock Screen controls and Notification.

- **config**:
  - `title` (string)
  - `artist` (string)
  - `artwork` (string URL)
  - `hasNext` (boolean): Enables "Next" button.
  - `hasPrevious` (boolean): Enables "Previous" button.

#### `destroy(): void`

Releases native resources. **Always call this when you are done with the player/component unmounts.**

### Events

#### `onStateChange(callback: (state: PlaybackState) => void)`

Listens for state changes (`idle`, `buffering`, `playing`, `paused`, `ended`).

#### `onProgress(callback: (position: number, duration: number) => void)`

Listens for progress updates (in seconds) during playback.

#### `onError(callback: (code: string, message: string) => void)`

Listens for playback errors.

---

## AudioRecorder

The `AudioRecorder` class handles recording audio from the microphone.

### Constructor

```typescript
new AudioRecorder();
```

### Methods

#### `prepare(path: string, options: RecordingOptions): Promise<string>`

Prepares the recorder.

- **path**: Absolute path to save the file (e.g., `${RNFS.DocumentDirectoryPath}/rec.aac`).
- **options**:
  - `sampleRate` (number): e.g., 44100.
  - `channels` (number): 1 (mono) or 2 (stereo).
  - `bitrate` (number): e.g., 128000.
  - `quality` (string): 'low', 'medium', 'high'.

#### `start(): Promise<void>`

Starts recording.

#### `pause(): Promise<void>`

Pauses recording (Android only).

#### `resume(): Promise<void>`

Resumes recording (Android only).

#### `stop(): Promise<string>`

Stops recording and returns the final file path.

### Events

#### `onMetering(callback: (power: number) => void)`

Receives the current decibel level of input (for visualization).

---

## AudioQueue

The `AudioQueue` class manages a playlist of songs, auto-transitions, and system notifications.

### Constructor

```typescript
new AudioQueue();
```

### Methods

#### `playList(tracks: AudioAsset[], startIndex?: number): Promise<void>`

Replaces the current queue with a new list and plays the track at `startIndex`.

- **tracks**: Array of `AudioAsset` objects.

#### `add(tracks: AudioAsset[]): void`

Appends tracks to the end of the current queue.

#### `next(): Promise<void>`

Skips to the next track if available. Automatically updates Lock Screen.

#### `prev(): Promise<void>`

Skips to the previous track.

#### `getCurrentTrack(): AudioAsset | null`

Returns the currently playing `AudioAsset`.

#### `getQueue(): AudioAsset[]`

Returns the full queue array.

#### `onChange(callback: (queue: AudioAsset[], current: AudioAsset | null) => void)`

Subscribes to changes in the queue or current track. Use this to update your UI.

#### `destroy(): void`

Stops playback and releases all resources (listeners, player instance). Call this when unmounting your main component.

---

## Troubleshooting

### 1. Audio Stops When App is Backgrounded

- **Android**: Ensure `FOREGROUND_SERVICE` permission is in `AndroidManifest.xml` (Library handles this, but your app must likely not block it).
- **iOS**: Ensure `UIBackgroundModes` includes `audio` in `Info.plist`.

### 2. Notification Buttons Duplicate or Do Nothing

- Ensure you have called `destroy()` on previous players or queues.
- If using `AudioQueue`, it handles notifications automatically. Do not call `player.setupNotification()` manually if using `AudioQueue`.

### 3. Build Errors

- **Android**: Ensure `minSdkVersion` is at least 21 (Android 5.0).
- **iOS**: Ensure `platform :ios, '11.0'` or higher in `Podfile`.

### 4. Audio Focus (Interruption)

- The library automatically requests `AUDIO_CONTENT_TYPE_MUSIC` (Android) and `AVAudioSessionCategoryPlayback` (iOS).
- If another app starts playing, this library should pause. If you want to resume after interruption (e.g. phone call), listen to state changes or use `AudioQueue` which handles basic state recovery.

---

## Hooks: `useAudioPlayer`

A React Hook wrapper around `AudioPlayer` for functional components.

```typescript
const {
  player, // The underlying AudioPlayer instance
  state, // 'idle' | 'playing' | 'paused' | 'buffering' | 'ended'
  position, // Current time in seconds
  duration, // Total duration in seconds
  play,
  pause,
  stop,
  seek,
} = useAudioPlayer(url, options);
```

- **url**: Audio source URL.
- **options**: Same as `AudioPlayer` constructor options.

**Note**: The hook automatically handles `prepare()` on mount and `destroy()` on unmount (if `autoDestroy` is true).

---

## Media Library Helpers

Functions to access user's local music library.

#### `getAllAudios(): Promise<AudioAsset[]>`

Scans the device (Android MediaStore / iOS Apple Music Library) for audio files.
**Returns**:

- `id`: Unique ID.
- `uri`: File URI (playable).
- `title`: Song title.
- `artist`: Artist name.
- `album`: Album name.
- `duration`: Duration in seconds.
- `artwork`: Artwork URL (if available).

#### `getAlbums(): Promise<Album[]>`

Helper that groups the result of `getAllAudios()` by Album.
**Returns**: Array of `{ name, artist, artwork, songs: AudioAsset[] }`.

---

## Audio Equalizer

The equalizer allows you to customize audio output with multi-band frequency control.

### Methods

#### `player.enableEqualizer(enabled: boolean): Promise<void>`

Enables or disables the equalizer for the player.

```typescript
await player.enableEqualizer(true);
```

#### `player.setEqualizerBand(bandIndex: number, gain: number): Promise<void>`

Sets the gain for a specific frequency band.

- **bandIndex**: Band index (0-4 for 5-band equalizer)
- **gain**: Gain in decibels (-15 to +15)

```typescript
// Boost bass (band 0)
await player.setEqualizerBand(0, 8.0);

// Cut treble (band 4)
await player.setEqualizerBand(4, -5.0);
```

#### `player.getEqualizerBands(): Promise<Array<{frequency: number, gain: number}>>`

Returns all equalizer bands with their frequencies and current gain values.

```typescript
const bands = await player.getEqualizerBands();
// [{frequency: 60, gain: 0}, {frequency: 230, gain: 0}, ...]
```

### Example: Custom EQ Preset

```typescript
const player = new AudioPlayer("song.mp3");
await player.prepare();
await player.enableEqualizer(true);

// Bass boost preset
await player.setEqualizerBand(0, 6.0); // 60 Hz
await player.setEqualizerBand(1, 4.0); // 230 Hz
await player.setEqualizerBand(2, 0.0); // 910 Hz
await player.setEqualizerBand(3, -2.0); // 3.6 kHz
await player.setEqualizerBand(4, -4.0); // 14 kHz
```

---

## Cache Management

Manage audio file caching for offline playback and improved performance.

### CacheManager API

#### `CacheManager.setCacheConfig(config: CacheConfig): Promise<void>`

Configure cache settings.

```typescript
import { CacheManager } from "react-native-audio-kit";

await CacheManager.setCacheConfig({
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  enabled: true,
});
```

**Config Options**:

- `maxSizeBytes`: Maximum cache size in bytes (default: 100MB)
- `enabled`: Enable/disable caching (default: true)

#### `CacheManager.getCacheStatus(): Promise<CacheStatus>`

Get current cache status.

```typescript
const status = await CacheManager.getCacheStatus();
console.log(`Cache size: ${status.sizeBytes} bytes`);
console.log(`Cached items: ${status.itemCount}`);
```

#### `CacheManager.clearCache(): Promise<void>`

Clear all cached audio files.

```typescript
await CacheManager.clearCache();
```

---

## Enhanced Recording Options

### Quality Presets

Use quality presets for easy configuration:

```typescript
const recorder = new AudioRecorder();

await recorder.prepare("/path/to/recording.aac", {
  quality: "high", // 'low' | 'medium' | 'high'
  format: "aac",
});
```

**Quality Presets**:

- `low`: 64 kbps, 22050 Hz, mono
- `medium`: 128 kbps, 44100 Hz, stereo
- `high`: 256 kbps, 48000 Hz, stereo

### Manual Configuration

For fine-grained control:

```typescript
await recorder.prepare("/path/to/recording.aac", {
  format: "aac",
  sampleRate: 48000,
  channels: 2,
  bitrate: 192000,
});
```

---

## Network Options

Configure network resilience for streaming:

```typescript
const player = new AudioPlayer("https://stream.example.com/audio.mp3", {
  network: {
    retryCount: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1s before first retry
    bufferDuration: 10, // Buffer 10 seconds of audio
  },
});
```

---

## Adaptive Streaming

HLS (.m3u8) and DASH streams are supported natively:

```typescript
const player = new AudioPlayer("https://example.com/stream.m3u8");
await player.prepare();
await player.play();
```

The underlying players (ExoPlayer/AVPlayer) handle adaptive bitrate switching automatically.

---
