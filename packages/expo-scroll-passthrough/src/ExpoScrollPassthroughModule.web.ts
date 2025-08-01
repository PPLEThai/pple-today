import { registerWebModule, NativeModule } from 'expo';

import { ExpoScrollPassthroughModuleEvents } from './ExpoScrollPassthrough.types';

class ExpoScrollPassthroughModule extends NativeModule<ExpoScrollPassthroughModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoScrollPassthroughModule, 'ExpoScrollPassthroughModule');
