import { rollupAMDConfig, rollupAMDOutput } from './lib';

export default {
    ...rollupAMDConfig,
    output: rollupAMDOutput('dev'),
};
