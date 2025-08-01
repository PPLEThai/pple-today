// Reexport the native module. On web, it will be resolved to ExpoScrollPassthroughModule.web.ts
// and on native platforms to ExpoScrollPassthroughModule.ts
export { default } from './ExpoScrollPassthroughModule';
export { default as ExpoScrollPassthroughView } from './ExpoScrollPassthroughView';
export * from  './ExpoScrollPassthrough.types';
