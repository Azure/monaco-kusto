module.exports = {
    testPathIgnorePatterns: ['/node_modules/', '/tests/integration/', '/test/', '/scripts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
};
