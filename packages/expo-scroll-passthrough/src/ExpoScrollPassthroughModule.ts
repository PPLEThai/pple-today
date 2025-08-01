import { NativeModule, requireNativeModule } from 'expo';

import { ExpoScrollPassthroughModuleEvents } from './ExpoScrollPassthrough.types';

declare class ExpoScrollPassthroughModule extends NativeModule<ExpoScrollPassthroughModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoScrollPassthroughModule>('ExpoScrollPassthrough');
