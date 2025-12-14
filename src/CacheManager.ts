import { NativeAudio } from './native';
import { CacheConfig, CacheStatus } from './types';

/**
 * Cache Management Utilities
 * Provides methods to configure and manage audio file caching
 */
export class CacheManager {
  /**
   * Configure cache settings
   * @param config Cache configuration options
   */
  static async setCacheConfig(config: CacheConfig): Promise<void> {
    return NativeAudio.setCacheConfig(config);
  }

  /**
   * Get current cache status
   * @returns Cache size and item count
   */
  static async getCacheStatus(): Promise<CacheStatus> {
    return NativeAudio.getCacheStatus();
  }

  /**
   * Clear all cached audio files
   */
  static async clearCache(): Promise<void> {
    return NativeAudio.clearCache();
  }
}
