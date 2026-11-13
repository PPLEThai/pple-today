module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [],
    overrides: [
      {
        // nativewind's JSX transform wraps every Pressable, and drops a `style`
        // given as a function of the pressed state. React Native's own UI
        // (LogBox's warning and error toasts) relies on that, so it rendered
        // white with invisible text. RN's internals never use `className`:
        // compile them with plain React JSX. Top-level plugins run before
        // presets, so this transforms the JSX before nativewind's does.
        // A function, not a RegExp: Expo also loads this config without a
        // filename, and Babel rejects a RegExp `test` then.
        test: (filename) =>
          filename != null && /node_modules[\\/]react-native[\\/]Libraries[\\/]/.test(filename),
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: 'react' }],
        ],
      },
    ],
  }
}
