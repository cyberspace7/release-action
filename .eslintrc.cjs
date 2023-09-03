/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/** @type {import("path")} */
const path = require("path");

/** @type {import("eslint").Linter.Config} */
const configuration = {
  parserOptions: {
    project: path.join(__dirname, "tsconfig.json"),
  },
  extends: ["@cyberspace-7", "prettier"],
};

module.exports = configuration;
