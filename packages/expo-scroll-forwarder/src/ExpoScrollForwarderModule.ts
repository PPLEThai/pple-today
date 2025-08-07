import { requireNativeModule } from 'expo'

declare class ExpoScrollForwarderModule {}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoScrollForwarderModule>('ExpoScrollForwarder')
