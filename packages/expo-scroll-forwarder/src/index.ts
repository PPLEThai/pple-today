// Reexport the native module. On web, it will be resolved to ExpoScrollForwarderModule.web.ts
// and on native platforms to ExpoScrollForwarderModule.ts
export * from './ExpoScrollForwarder.types'
export { default } from './ExpoScrollForwarderModule'
export { default as ExpoScrollForwarderView } from './ExpoScrollForwarderView'
