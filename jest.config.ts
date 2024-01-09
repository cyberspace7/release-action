import type { JestConfigWithTsJest } from "ts-jest";

const configuration = {
  extensionsToTreatAsEsm: [".ts"],
  fakeTimers: {
    enableGlobally: true,
  },
  globalSetup: "<rootDir>/tests/jest.setup.ts",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  prettierPath: "<rootDir>/node_modules/prettier",
  setupFilesAfterEnv: ["<rootDir>/tests/mocks.ts"],
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.test.json" }],
  },
  verbose: true,
} satisfies JestConfigWithTsJest;

module.exports = configuration;
