import { readFileSync } from "fs";
import * as core from "@actions/core";
import semver, { SemVer } from "semver";
import { z } from "zod";
import { tryExecute } from "./common";

const NODE_PACKAGE_NAME_REGEX = /^(@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+$/;
export const PACKAGE_FILE_NAME = "package.json";

const nodePackageSchema = z.object({
  name: z
    .string()
    .regex(NODE_PACKAGE_NAME_REGEX)
    .transform((value) => {
      const name = value.indexOf("/") > -1 ? value.split("/")[1] : value;
      if (!name) {
        throw new Error(`Invalid package name: "${value}".`);
      }

      return name;
    }),
  version: z
    .string()
    .optional()
    .transform((value) => {
      if (value && !semver.valid(value)) {
        throw new Error(`Invalid package version: "${value}".`);
      }

      return semver.parse(value);
    }),
});

export function getNodePackage() {
  return tryExecute(() => {
    core.debug(`Reading ${PACKAGE_FILE_NAME}...`);
    const packageFile = readFileSync(PACKAGE_FILE_NAME, "utf8");
    const nodePackage = nodePackageSchema.parse(JSON.parse(packageFile));
    core.debug(
      `name="${nodePackage.name}"; version=${nodePackage.version?.version}.`,
    );
    core.info(`${PACKAGE_FILE_NAME} read.`);

    return nodePackage;
  }, `Error while reading ${PACKAGE_FILE_NAME}.`);
}

export function createNewNodePackageEncodedContent(version: SemVer) {
  return tryExecute(() => {
    core.debug(`Creating new ${PACKAGE_FILE_NAME} encoded content...`);
    const packageFile = readFileSync(PACKAGE_FILE_NAME, "utf8");
    const content = JSON.parse(packageFile) as Record<string, unknown>;
    const orderedContent: Record<string, unknown> = {
      name: content["name"],
      version: version.version,
    };
    for (const [key, value] of Object.entries(content)) {
      if (!["name", "version"].includes(key)) {
        orderedContent[key] = value;
      }
    }
    const newContent = Buffer.from(
      JSON.stringify(orderedContent, null, 2) + "\n",
    ).toString("base64");
    core.info(`${PACKAGE_FILE_NAME} updated.`);

    return newContent;
  }, `Error while creating new ${PACKAGE_FILE_NAME} encoded content.`);
}
