import type { Config } from "jest";

const configuration: Config = {
  preset: "ts-jest",
  verbose: true,
  fakeTimers: {
    enableGlobally: true,
  },
  prettierPath: "<rootDir>/node_modules/prettier",
  globalSetup: "<rootDir>/tests/jest.setup.ts",
  setupFilesAfterEnv: ["<rootDir>/tests/mocks.ts"],
};

module.exports = configuration;
