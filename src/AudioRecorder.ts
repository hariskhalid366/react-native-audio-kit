import { NativeEventEmitter } from 'react-native';
import { NativeAudio } from './native';
import { RecordingOptions, MeteringListener } from './types';
import { EmitterSubscription } from 'react-native';

// Assuming AudioEventEmitter is now an instance of NativeEventEmitter
// and needs to be created.
// If AudioEventEmitter was previously imported as a specific instance,
// this might need adjustment based on how it's exposed in './native'.
// For now, we'll assume it's a new instance of NativeEventEmitter
// that listens to events from NativeAudio.
const AudioEventEmitter = new NativeEventEmitter(NativeAudio as any);

export class AudioRecorder {
  private subscriptions: EmitterSubscription[] = [];

  constructor() {}

  async prepare(path: string, options: RecordingOptions = {}): Promise<string> {
    return NativeAudio.prepareRecorder(path, options);
  }

  async start(): Promise<void> {
    return NativeAudio.startRecording();
  }

  async stop(): Promise<string> {
    return NativeAudio.stopRecording();
  }

  async pause(): Promise<void> {
    return NativeAudio.pauseRecording();
  }

  async resume(): Promise<void> {
    return NativeAudio.resumeRecording();
  }

  onMetering(callback: MeteringListener): () => void {
    const sub = AudioEventEmitter.addListener('AudioRecorderEvent.Metering', (event: any) => {
      callback(event.db);
    });
    this.subscriptions.push(sub);
    return () => sub.remove();
  }

  destroy(): void {
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
  }
}
