package com.reactlibrary;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class ReactNativeAudioPackage extends TurboReactPackage {

    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (name.equals(ReactNativeAudioModule.NAME)) {
            return new ReactNativeAudioModule(reactContext);
        }
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return new ReactModuleInfoProvider() {
            @Override
            public Map<String, ReactModuleInfo> getReactModuleInfos() {
                final Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();

                // Ensure boolean value, not string
                boolean isTurboModule = false;
                try {
                    isTurboModule = com.reactlibrary.BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
                } catch (Exception e) {
                    isTurboModule = false;
                }

                moduleInfos.put(
                        ReactNativeAudioModule.NAME,
                        new ReactModuleInfo(
                                ReactNativeAudioModule.NAME, // name
                                ReactNativeAudioModule.NAME, // className
                                false, // canOverrideExistingModule
                                false, // needsEagerInit
                                true, // hasConstants
                                false, // isCxxModule
                                isTurboModule // isTurboModule
                ));

                return moduleInfos;
            }
        };
    }
}
