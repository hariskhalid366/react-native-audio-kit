import { AudioPlayer } from './AudioPlayer';
import { AudioEventEmitter } from './events';
import { AudioAsset, PlaybackState } from './types';

export class AudioQueue {
  private queue: AudioAsset[] = [];
  private currentIndex: number = -1;
  private player: AudioPlayer | null = null;
  private listeners: ((queue: AudioAsset[], current: AudioAsset | null) => void)[] = [];

  constructor() {}

  /**
   * Replaces the current queue and plays the first track (or specific index).
   */
  async playList(tracks: AudioAsset[], startIndex: number = 0) {
    this.queue = [...tracks];
    this.currentIndex = startIndex;
    await this.playCurrent();
  }

  /**
   * Adds tracks to the end of the queue.
   */
  add(tracks: AudioAsset[]) {
    this.queue.push(...tracks);
    this.emitChange();
  }

  /**
   * Skips to the next track.
   */
  async next() {
    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      await this.playCurrent();
    }
  }

  /**
   * Skips to the previous track.
   */
  async prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      await this.playCurrent();
    }
  }

  getCurrentTrack(): AudioAsset | null {
    return this.queue[this.currentIndex] || null;
  }

  getQueue(): AudioAsset[] {
    return this.queue;
  }

  /**
   * Internal music player logic.
   */
  private async playCurrent() {
    const track = this.getCurrentTrack();
    if (!track) return;

    if (this.player) {
      await this.player.stop();
      this.player.destroy();
    }

    this.player = new AudioPlayer(track.uri, {
      autoDestroy: false, 
      continuesToPlayInBackground: true 
    });

    // Auto-Next Logic
    this.player.onStateChange((state) => {
      if (state === PlaybackState.Ended) {
        this.next();
      }
    });

    // Remote Command Listeners
    // We must clean these up when the player is destroyed or track changes.
    const remoteSubs = [
      AudioEventEmitter.addListener('AudioPlayerEvent.RemotePlay', (evt: any) => {
        if (evt.id === this.player?.id) this.player?.play();
      }),
      AudioEventEmitter.addListener('AudioPlayerEvent.RemotePause', (evt: any) => {
        if (evt.id === this.player?.id) this.player?.pause();
      }),
      AudioEventEmitter.addListener('AudioPlayerEvent.RemoteNext', (evt: any) => {
        if (evt.id === this.player?.id) this.next();
      }),
      AudioEventEmitter.addListener('AudioPlayerEvent.RemotePrevious', (evt: any) => {
        if (evt.id === this.player?.id) this.prev();
      }),
    ];

    // Modify destroy/cleanup to remove these listeners
    const originalDestroy = this.player.destroy.bind(this.player);
    this.player.destroy = () => {
       remoteSubs.forEach(sub => sub.remove());
       originalDestroy();
    };

    // Set Metadata & Notification
    // Ensure player is ready before setting notifications
    await this.player.prepare();
    
    // Check Queue State for Next/Prev buttons
    const hasNext = this.currentIndex < this.queue.length - 1;
    const hasPrevious = this.currentIndex > 0;
    
    await this.player.setupNotification({
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      hasNext,
      hasPrevious
    });

    await this.player.play();
    this.emitChange();
  }

  /**
   * Subscribe to queue updates.
   */
  onChange(callback: (queue: AudioAsset[], current: AudioAsset | null) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private emitChange() {
    const current = this.getCurrentTrack();
    this.listeners.forEach(cb => cb(this.queue, current));
  }

  /**
   * Stops playback and releases resources.
   */
  destroy() {
    if (this.player) {
      this.player.stop();
      this.player.destroy();
      this.player = null;
    }
    this.listeners = [];
  }
}



// We'll extend the class prototypically or just add logic inside the class.
// A cleaner way is to add the logic inside playCurrent where we have the player instance.


