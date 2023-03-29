1. Install Node 16 and Yarn
2. Run `yarn` to install packages
3. Run `yarn build` to copy monaco editor and monaco-kusto to /vs
    1. Kusto worker doesn't respect require config created on the window, so
       files much always have the same relative path to each other
4. Run `yarn start` to start a server. Opening ./index.html directly will not
   work because the file:// protocol does not support service workers.
