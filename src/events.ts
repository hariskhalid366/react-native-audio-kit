import { NativeEventEmitter } from 'react-native';
import { NativeAudio } from './native';

export const AudioEventEmitter = new NativeEventEmitter(NativeAudio as any);
