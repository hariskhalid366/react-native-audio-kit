#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <AVFoundation/AVFoundation.h>
#import <MediaPlayer/MediaPlayer.h>

@interface ReactNativeAudio : RCTEventEmitter <RCTBridgeModule, AVAudioPlayerDelegate>

@end
