// Important that these packages are always imported in this specific order

import '@kusto/language-service/bridge';

// declare global {
//   interface Window {
//       System2: typeof System;
//   }
// }

// self.System2 = System;

import '@kusto/language-service/newtonsoft.json';
// non-min version of this import is invalid javascript
import '@kusto/language-service/Kusto.JavaScript.Client.min';
import '@kusto/language-service-next/Kusto.Language.Bridge';

// export * from './kustoLanguageService';
