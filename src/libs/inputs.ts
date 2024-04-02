import { getInput } from "@actions/core";
import semver from "semver";
import { z } from "zod";

const PRE_RELEASE_REGEX = /^[A-Za-z0-9-]+$/;

export type Environment = z.infer<typeof environmentSchema>;
export type Inputs = z.infer<typeof inputsSchema>;

function parseMultipleValues(value: string, defaultValues: string[]) {
  const values = value
    .split(/\r|\n/)
    .map((value) => value.trim().replace(/^["']|["']$/g, ""))
    .filter((value) => {
      return value.length > 0;
    });

  return values.length ? values : defaultValues;
}

const environmentSchema = z.object({
  GITHUB_TOKEN: z.string(),
});

const inputsSchema = z.object({
  preRelease: z
    .string()
    .trim()
    .regex(PRE_RELEASE_REGEX)
    .or(z.literal(""))
    .transform((value) => {
      return value !== "" ? value : null;
    }),
  releaseAs: z
    .string()
    .trim()
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
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return parseMultipleValues(value, ["ignore"]);
      }),
    patch: z
      .string()
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return parseMultipleValues(value, ["patch", "fix"]);
      }),
    minor: z
      .string()
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return parseMultipleValues(value, ["minor", "feature"]);
      }),
    major: z
      .string()
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return parseMultipleValues(value, ["major", "breaking"]);
      }),
    ready: z
      .string()
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return value.length > 0 ? value : "release: ready";
      }),
    done: z
      .string()
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return value.length > 0 ? value : "release: done";
      }),
  }),
  branches: z.object({
    production: z
      .string()
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return value.length > 0 ? value : "main";
      }),
    release: z
      .string()
      .trim()
      .or(z.literal(""))
      .transform((value) => {
        return value.length > 0 ? value : "releases/next";
      }),
  }),
  skipPullRequestCreation: z.boolean().default(false),
});

export function parseEnvironment() {
  return environmentSchema.parse(process.env);
}

function getBooleanInput(name: string) {
  return ["true", "1"].includes(getInput(name).toLowerCase());
}

export function parseInputs() {
  return inputsSchema.parse({
    preRelease: getInput("pre-release"),
    releaseAs: getInput("release-as"),
    releaseLabels: {
      ignore: getInput("labels-ignore"),
      patch: getInput("labels-patch"),
      minor: getInput("labels-minor"),
      major: getInput("labels-major"),
      ready: getInput("label-ready"),
      done: getInput("label-done"),
    },
    branches: {
      production: getInput("branch-production"),
      release: getInput("branch-release"),
    },
    skipPullRequestCreation: getBooleanInput("skip-pr-creation"),
  });
}

export const environment = parseEnvironment();

export const inputs = parseInputs();
