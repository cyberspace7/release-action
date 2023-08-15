import { getInput } from "@actions/core";
import semver from "semver";
import { z } from "zod";

const PRE_RELEASE_REGEX = /^[A-Za-z0-9-]+$/;

const environmentValidator = z.object({
  GITHUB_TOKEN: z.string(),
});
const preReleaseValidator = z
  .string()
  .regex(PRE_RELEASE_REGEX)
  .or(z.literal(""))
  .transform((value) => {
    return value !== "" ? value : undefined;
  });
const releaseAsValidator = z
  .string()
  .or(z.literal(""))
  .transform((value) => {
    if (value && !semver.valid(value)) {
      throw new Error(`Invalid version: "${value}".`);
    }

    return value ? semver.parse(value) ?? undefined : undefined;
  });

export const environment = environmentValidator.parse(process.env);

export const getPreRelease = () => {
  return preReleaseValidator.parse(getInput("pre-release"));
};

export const getReleaseAs = () => {
  return releaseAsValidator.parse(getInput("release-as"));
};
