import * as core from "@actions/core";
import { context } from "@actions/github";
import { SemVer } from "semver";
import { inputs } from "./libs/inputs";
import { getNodePackage } from "./libs/nodePackage";
import { createReleasePullRequestBody } from "./libs/releaseNotes";
import {
  generateReleaseNotesForPullRequest,
  getPullRequestsSinceLastRelease,
  getReleasePullRequest,
} from "./libs/repository";
import { getNextVersion, getVersionBumpLevel } from "./libs/version";

const tryGetNextVersion = (
  currentVersion: SemVer | null,
  bumpLevel: number,
  preRelease: string | undefined,
) => {
  return bumpLevel > 0 || preRelease
    ? getNextVersion(currentVersion, bumpLevel, preRelease)
    : null;
};

const generatePullRequestBody = async (nextVersion: SemVer) => {
  const releaseNotes = await generateReleaseNotesForPullRequest(nextVersion);

  return createReleasePullRequestBody(releaseNotes);
};

export const setup = async () => {
  const { name, version: currentVersion } = getNodePackage();
  const mergedReleasePullRequest = await getReleasePullRequest("merged");
  const openReleasePullRequest = await getReleasePullRequest("open");
  const pullRequests = await getPullRequestsSinceLastRelease();
  const bumpLevel = getVersionBumpLevel(pullRequests, currentVersion);
  core.info(`Release as: ${inputs.releaseAs?.version ?? "none"}.`);
  core.info(`Pre-release: ${inputs.preRelease ?? "none"}.`);
  const nextVersion = !inputs.releaseAs
    ? tryGetNextVersion(currentVersion, bumpLevel, inputs.preRelease)
    : inputs.releaseAs;
  const releaseNotes = nextVersion
    ? await generatePullRequestBody(nextVersion)
    : undefined;

  return {
    name,
    currentVersion,
    nextVersion,
    isManualVersion:
      (!!inputs.preRelease || !!inputs.releaseAs) &&
      context.eventName === "workflow_dispatch",
    mergedReleasePullRequest,
    openReleasePullRequest,
    releaseNotes,
  };
};
