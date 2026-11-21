package com.notifyiq

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.BaseReactPackage
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class NotifyIQPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == NotifyIQModule.NAME) NotifyIQModule(reactContext) else null

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      NotifyIQModule.NAME to ReactModuleInfo(
        name = NotifyIQModule.NAME,
        className = NotifyIQModule::class.java.name,
        canOverrideExistingModule = false,
        needsEagerInit = false,
        isCxxModule = false,
        isTurboModule = false,
      ),
    )
  }
}
