Pod::Spec.new do |s|
  s.name           = 'NotificationActions'
  s.version        = '1.0.0'
  s.summary        = 'Submits interactive notification answers from the iOS notification tray.'
  s.description    = 'Handles background notification action presses natively, without the JS runtime. See docs/interactive-notifications.md.'
  s.license        = 'UNLICENSED'
  s.author         = 'PPLE Today'
  s.homepage       = 'https://github.com/PPLEThai/pple-today'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/PPLEThai/pple-today' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # NotificationCenterManager / NotificationDelegate live in expo-notifications.
  s.dependency 'EXNotifications'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
