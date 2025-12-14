# Roadmap & Known Limitations

The following features have been identified as missing or areas for improvement compared to full-featured audio libraries.

## 1. Adaptive Streaming Support

- **Status**: Pending Verification
- **Details**: HLS (m3u8), DASH, and progressive buffering.
- **Note**: Underlying ExoPlayer (Android) and AVPlayer (iOS) likely support this natively if the correct URL is provided, but it needs explicit testing and documentation.

## 2. Cross-Platform New Architecture

- **Status**: Not Started
- **Details**: Support for React Native's New Architecture (TurboModules / Fabric).

## 3. Advanced Playback Features

- **Status**: Not Started
- **Details**:
  - Gapless playback
  - Dynamic playback speed (beyond basic rate)
  - Equalizer / DSP effects

## 4. Multitrack / Simultaneous Playback

- **Status**: Needs Investigation
- **Details**: Concurrent playback, mixing tracks.
- **Note**: Multiple `AudioPlayer` instances might support capabilities, but `AudioQueue` is designed for single-track lists.

## 5. Download / Cache Management

- **Status**: Not Started
- **Details**: Offline caching, downloading to file system.

## 6. Network Resilience

- **Status**: Not Started
- **Details**: Buffering controls, retry logic, error recovery.

## 7. Recording Configuration

- **Status**: Basic Support Only
- **Details**: Need fine-grained control over format, bitrate, encoding (AAC/MP3/WAV), and metadata.

## 8. Waveform / Metering

- **Status**: Basic Metering Only
- **Details**: FFT analysis, real-time waveform data.

## 9. Extensive Platform Support

- **Status**: Mobile Only
- **Details**: Web, Windows, macOS support.

## 10. Documentation & Community

- **Status**: In Progress
- **Details**: Formal releases, robust API examples, contribution guidelines.
