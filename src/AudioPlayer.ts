import { NativeAudio } from './native';
import { AudioEventEmitter } from './index';
import { 
  PlayerOptions, 
  PlaybackStateListener, 
  ProgressListener, 
  ErrorListener,
  InterruptionListener 
} from './types';
import { EmitterSubscription } from 'react-native';

let nextPlayerId = 1;

export class AudioPlayer {
  public readonly id: number;
  private url: string;
  private options: PlayerOptions;
  private subscriptions: EmitterSubscription[] = [];

  constructor(url: string, options: PlayerOptions = {}) {
    this.id = nextPlayerId++;
    this.url = url;
    this.options = options;
  }

  async prepare(): Promise<void> {
    return NativeAudio.preparePlayer(this.id, this.url, this.options);
  }

  async play(): Promise<void> {
    return NativeAudio.play(this.id);
  }

  async pause(): Promise<void> {
    return NativeAudio.pause(this.id);
  }

  async stop(): Promise<void> {
    return NativeAudio.stop(this.id);
  }

  async seek(position: number): Promise<void> {
    return NativeAudio.seek(this.id, position);
  }

  async setVolume(volume: number): Promise<void> {
    return NativeAudio.setVolume(this.id, volume);
  }

  async setRate(rate: number): Promise<void> {
    return NativeAudio.setRate(this.id, rate);
  }

  async setMetadata(metadata: import('./types').AudioMetadata): Promise<void> {
    return NativeAudio.setMetadata(this.id, metadata);
  }

  async setupNotification(config: { 
    title: string; 
    artist: string; 
    artwork?: string;
    hasNext: boolean; 
    hasPrevious: boolean 
  }): Promise<void> {
    return NativeAudio.setupNotification(this.id, config);
  }

  onStateChange(callback: PlaybackStateListener): () => void {
    const sub = AudioEventEmitter.addListener(`AudioPlayerEvent.State.${this.id}`, (event: any) => {
      callback(event.state);
    });
    this.subscriptions.push(sub);
    return () => sub.remove();
  }

  onProgress(callback: ProgressListener): () => void {
    const sub = AudioEventEmitter.addListener(`AudioPlayerEvent.Progress.${this.id}`, (event: any) => {
      callback(event.position, event.duration);
    });
    this.subscriptions.push(sub);
    return () => sub.remove();
  }
  
  onError(callback: ErrorListener): () => void {
    const sub = AudioEventEmitter.addListener(`AudioPlayerEvent.Error.${this.id}`, (event: any) => {
      callback(event.error, event.message);
    });
    this.subscriptions.push(sub);
    return () => sub.remove();
  }

  onInterruption(callback: InterruptionListener): () => void {
    const sub = AudioEventEmitter.addListener(`AudioPlayerEvent.Interruption.${this.id}`, (event: any) => {
      callback(event.reason);
    });
    this.subscriptions.push(sub);
    return () => sub.remove();
  }

  destroy(): void {
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
    NativeAudio.destroyPlayer(this.id);
  }
}
