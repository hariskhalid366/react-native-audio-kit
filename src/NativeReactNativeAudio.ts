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
  
  // Cache Management
  setCacheConfig(config: Object): Promise<void>;
  getCacheStatus(): Promise<Object>;
  clearCache(): Promise<void>;
  
  // Equalizer
  enableEqualizer(id: number, enabled: boolean): Promise<void>;
  setEqualizerBand(id: number, bandIndex: number, gain: number): Promise<void>;
  getEqualizerBands(id: number): Promise<Array<Object>>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ReactNativeAudio');
