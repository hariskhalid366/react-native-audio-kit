import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  preparePlayer(id: number, url: string, options: Object): Promise<void>;
  play(id: number): Promise<void>;
  pause(id: number): Promise<void>;
  stop(id: number): Promise<void>;
  seek(id: number, position: number): Promise<void>;
  setVolume(id: number, volume: number): Promise<void>;
  setRate(id: number, rate: number): Promise<void>;
  setMetadata(id: number, metadata: Object): Promise<void>;
  destroyPlayer(id: number): void;

  prepareRecorder(path: string, options: Object): Promise<string>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  
  setupNotification(id: number, config: Object): Promise<void>;
  
  getAudios(): Promise<Array<Object>>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ReactNativeAudio');
