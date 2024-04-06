import path from "path";
import c7Configuration from "@cyberspace-7/eslint-config";

/** @type {import("eslint").Linter.FlatConfig[]} */
const configuration = [
  // @ts-ignore
  c7Configuration,
  {
    languageOptions: {
      parserOptions: {
        project: path.join(__dirname, "tsconfig.json"),
        extends: ["@cyberspace-7", "prettier"],
      },
    },
    env: {
      node: true,
    },

    ignores: [".vscode", "dist", "node_modules", "pnpm-lock.yaml"],
  },
];

export default configuration;
