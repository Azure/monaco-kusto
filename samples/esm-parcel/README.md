# Monaco Kusto Parcel example

See [../../README.md] for general esm setup instructions

## Parcel-specific changes

### Add `{ "alias": { "process": false } }` to `package.json`

@kusto/language-server includes node-specific code. Configure Parcel avoiding including `node_modules/process` in our bundle.

Parcel docs on disabling `process` shimming: https://parceljs.org/features/dependency-resolution/#package-aliases
Parcel docs on shimming globals: https://parceljs.org/features/node-emulation/#shimming-builtin-node-globals

### Patch monaco-editor to use globalThis.process instead of process

Recent monaco versions use `typeof process` to check if it's running in a node environment. Parcel doesn't have the ability to make this check return `false` so we need to patch monaco to use `globalThis.process` instead.

The yarn patch file this repo uses can be seen at `/.yarn/patches/monaco-editor-npm-0.49.0-fb69b10c11.patch`.

Yarn docs for patching packages: https://yarnpkg.com/cli/patch

Parcel issue tracking this: https://github.com/parcel-bundler/parcel/issues/9549
