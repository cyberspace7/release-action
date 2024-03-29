import * as core from "@actions/core";
import { context } from "@actions/github";
import { SemVer } from "semver";
import { inputs } from "./libs/inputs";
import { getNodePackage } from "./libs/node-package";
import { createReleasePullRequestBody } from "./libs/release-notes";
import {
  generateReleaseNotesForPullRequest,
  getPullRequestsSinceLastRelease,
  getReleasePullRequest,
} from "./libs/repository";
import { getNextVersion, getVersionBumpLevel } from "./libs/version";

function tryGetNextVersion(
  currentVersion: SemVer | null,
  bumpLevel: number,
  preRelease: string | null,
) {
  return bumpLevel > 0 || preRelease
    ? getNextVersion(currentVersion, bumpLevel, preRelease ?? undefined)
    : null;
}

async function generatePullRequestBody(nextVersion: SemVer) {
  const releaseNotes = await generateReleaseNotesForPullRequest(nextVersion);

  return createReleasePullRequestBody(releaseNotes);
}

export async function setup() {
  const nodePackage = getNodePackage();
  const mergedReleasePullRequest = await getReleasePullRequest("merged");
  const openReleasePullRequest = await getReleasePullRequest("open");
  const pullRequests = await getPullRequestsSinceLastRelease();
  const bumpLevel = getVersionBumpLevel(pullRequests, nodePackage.version);
  core.info(`Release as: ${inputs.releaseAs?.version ?? "none"}.`);
  core.info(`Pre-release: ${inputs.preRelease ?? "none"}.`);
  const nextVersion = !inputs.releaseAs
    ? tryGetNextVersion(nodePackage.version, bumpLevel, inputs.preRelease)
    : inputs.releaseAs;
  const releaseNotes = nextVersion
    ? await generatePullRequestBody(nextVersion)
    : null;

  return {
    name: nodePackage.name,
    currentVersion: nodePackage.version,
    nextVersion,
    isManualVersion:
      (!!inputs.preRelease || !!inputs.releaseAs) &&
      context.eventName === "workflow_dispatch",
    mergedReleasePullRequest,
    openReleasePullRequest,
    releaseNotes,
  };
}
