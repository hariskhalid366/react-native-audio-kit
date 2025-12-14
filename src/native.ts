import { NativeModules, Platform } from 'react-native';
import { AudioAsset } from './types';

const LINKING_ERROR =
  `The package 'react-native-audio' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

export interface NativeAudioType {
  preparePlayer(id: number, url: string, options: any): Promise<void>;
  play(id: number): Promise<void>;
  pause(id: number): Promise<void>;
  stop(id: number): Promise<void>;
  seek(id: number, position: number): Promise<void>;
  setVolume(id: number, volume: number): Promise<void>;
  setRate(id: number, rate: number): Promise<void>;
  setMetadata(id: number, metadata: any): Promise<void>;
  destroyPlayer(id: number): void;
  
  prepareRecorder(path: string, options: any): Promise<string>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  
  // Notifications
  setupNotification(id: number, config: any): Promise<void>;
  
  getAudios(): Promise<AudioAsset[]>;
}

export const NativeAudio: NativeAudioType =
  // @ts-ignore
  global.__turboModuleProxy != null
    ? require('./NativeReactNativeAudio').default
    : NativeModules.ReactNativeAudio
    ? NativeModules.ReactNativeAudio
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );
