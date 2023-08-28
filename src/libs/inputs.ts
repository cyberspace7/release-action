import { getInput } from "@actions/core";
import semver from "semver";
import { z } from "zod";

const PRE_RELEASE_REGEX = /^[A-Za-z0-9-]+$/;

export type Environment = z.infer<typeof environmentValidator>;
export type Inputs = z.infer<typeof inputsValidator>;

const environmentValidator = z.object({
  GITHUB_TOKEN: z.string(),
});

const inputsValidator = z.object({
  preRelease: z
    .string()
    .regex(PRE_RELEASE_REGEX)
    .or(z.literal(""))
    .transform((value) => {
      return value !== "" ? value : undefined;
    }),
  releaseAs: z
    .string()
    .or(z.literal(""))
    .transform((value) => {
      if (value && !semver.valid(value)) {
        throw new Error(`Invalid version: "${value}".`);
      }

      return value ? semver.parse(value) ?? undefined : undefined;
    }),
  releaseLabels: z.object({
    ignore: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "changelog-ignore";
      }),
    patch: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "type: fix";
      }),
    minor: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "type: feature";
      }),
    major: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "breaking";
      }),
    ready: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "release: ready";
      }),
    done: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "release: done";
      }),
  }),
});

export const parseEnvironment = () => {
  return environmentValidator.parse(process.env);
};

export const parseInputs = () => {
  return inputsValidator.parse({
    preRelease: getInput("pre-release"),
    releaseAs: getInput("release-as"),
    releaseLabels: {
      ignore: getInput("label-ignore"),
      patch: getInput("label-patch"),
      minor: getInput("label-minor"),
      major: getInput("label-major"),
      ready: getInput("label-ready"),
      done: getInput("label-done"),
    },
  });
};

export const environment = parseEnvironment();

export const inputs = parseInputs();
