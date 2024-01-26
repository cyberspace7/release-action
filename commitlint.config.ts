import type { UserConfig } from "@commitlint/types";

const configuration = {
  extends: ["@commitlint/config-conventional"],
  defaultIgnores: !process.env["CI"],
} satisfies UserConfig;

export default configuration;
