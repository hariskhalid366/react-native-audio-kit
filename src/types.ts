
export enum PlaybackState {
  Idle = 'idle',
  Loading = 'loading',
  Playing = 'playing',
  Paused = 'paused',
  Buffering = 'buffering',
  Ended = 'ended',
  Error = 'error',
}

export enum AudioError {
  None = 'none',
  Network = 'network',
  Decode = 'decode',
  NotSupported = 'not_supported',
  Permissions = 'permissions',
  Unknown = 'unknown',
}

export interface PlayerOptions {
  autoDestroy?: boolean;
  continuesToPlayInBackground?: boolean;
  loop?: boolean;
  volume?: number;
  rate?: number;
  cache?: CacheConfig;
  network?: NetworkOptions;
}

export interface RecordingOptions {
  format?: 'aac' | 'wav' | 'mp3';
  quality?: 'low' | 'medium' | 'high'; // Preset quality levels
  sampleRate?: number; // e.g. 44100
  channels?: 1 | 2;
  bitrate?: number; // e.g. 128000
  encoder?: string;
  meteringEnabled?: boolean;
}

// Cache Management
export interface CacheConfig {
  maxSizeBytes?: number; // Maximum cache size (default: 100MB)
  enabled?: boolean; // Enable/disable caching
}

export interface CacheStatus {
  sizeBytes: number;
  itemCount: number;
}

// Equalizer
export interface EqualizerBand {
  frequency: number; // Hz
  gain: number; // dB (-15 to +15)
}

export interface EqualizerPreset {
  name: string;
  bands: EqualizerBand[];
}

// Network Resilience
export interface NetworkOptions {
  retryCount?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in ms (default: 1000)
  bufferDuration?: number; // Buffer duration in seconds (default: 10)
}

export interface AudioMetadata {
  title?: string;
  artist?: string;
  artwork?: string; // URL or local path
  album?: string;
  duration?: number;
  
  // Notification Logic
  isQueueEnabled?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export type PlaybackStateListener = (state: PlaybackState) => void;
export type ProgressListener = (position: number, duration: number) => void;
export type ErrorListener = (code: string, message: string) => void;
export type MeteringListener = (db: number) => void;

export type InterruptionReason = 'noisy' | 'call' | 'duck';
export type InterruptionListener = (reason: InterruptionReason) => void;

export interface AudioErrorDetails {
  code: string;
  message: string;
}
export interface AudioAsset {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  artwork?: string;
}

export interface Album {
  name: string;
  artist: string;
  artwork?: string;
  songs: AudioAsset[];
}
