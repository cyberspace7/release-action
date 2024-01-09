import { getInput } from "@actions/core";
import semver from "semver";
import { z } from "zod";

const PRE_RELEASE_REGEX = /^[A-Za-z0-9-]+$/;

export type Environment = z.infer<typeof environmentSchema>;
export type Inputs = z.infer<typeof inputsSchema>;

const environmentSchema = z.object({
  GITHUB_TOKEN: z.string(),
});

const inputsSchema = z.object({
  preRelease: z
    .string()
    .regex(PRE_RELEASE_REGEX)
    .or(z.literal(""))
    .transform((value) => {
      return value !== "" ? value : null;
    }),
  releaseAs: z
    .string()
    .or(z.literal(""))
    .transform((value) => {
      if (value && !semver.valid(value)) {
        throw new Error(`Invalid version: "${value}".`);
      }

      return value ? semver.parse(value) : null;
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
  branches: z.object({
    production: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "main";
      }),
    release: z
      .string()
      .or(z.literal(""))
      .transform((value) => {
        return value?.length ? value : "releases/next";
      }),
  }),
});

export const parseEnvironment = () => {
  return environmentSchema.parse(process.env);
};

export const parseInputs = () => {
  return inputsSchema.parse({
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
    branches: {
      production: getInput("branch-production"),
      release: getInput("branch-release"),
    },
  });
};

export const environment = parseEnvironment();

export const inputs = parseInputs();
