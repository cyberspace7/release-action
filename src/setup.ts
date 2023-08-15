import * as core from "@actions/core";
import { context } from "@actions/github";
import { SemVer } from "semver";
import { getPreRelease, getReleaseAs } from "./libs/inputs";
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
  const releaseAs = getReleaseAs();
  core.info(`Release as: ${releaseAs?.version || "none"}.`);
  const preRelease = getPreRelease();
  core.info(`Pre-release: ${preRelease || "none"}.`);
  const nextVersion = !releaseAs
    ? tryGetNextVersion(currentVersion, bumpLevel, preRelease)
    : releaseAs;
  const releaseNotes = nextVersion
    ? await generatePullRequestBody(nextVersion)
    : undefined;

  return {
    name,
    currentVersion,
    nextVersion,
    isManualVersion:
      (!!preRelease || !!releaseAs) &&
      context.eventName === "workflow_dispatch",
    mergedReleasePullRequest,
    openReleasePullRequest,
    releaseNotes,
  };
};
