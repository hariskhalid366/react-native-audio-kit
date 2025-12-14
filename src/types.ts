
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
}

export interface RecordingOptions {
  format?: 'aac' | 'wav' | 'mp3';
  sampleRate?: number; // e.g. 44100
  channels?: 1 | 2;
  bitrate?: number; // e.g. 128000
  encoder?: string;
  meteringEnabled?: boolean;
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
