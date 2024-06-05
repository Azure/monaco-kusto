// The next import is needed to preload `bridge.min.js` because if I don't, some
// weird Vite-stuff makes it load after `Kusto.JavaScript.Client.min` (in
// `kusto.worker.js`), which causes the `Bridge` object to be undefined. Only
// necessary for Vite.
import '@kusto/language-service/bridge.min';

import '../../../release/esm/kusto.worker';
