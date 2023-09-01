import * as core from "@actions/core";
import { SemVer } from "semver";
import { PullRequest } from "./libs/repository";
import { prepare } from "./prepare";
import { release } from "./release";
import { setup } from "./setup";

const tryRelease = async (
  name: string,
  currentVersion: SemVer | null,
  releasePullRequest: PullRequest | undefined,
) => {
  if (currentVersion) {
    core.info(`Current version: ${currentVersion.version}`);
    core.setOutput("current-version", currentVersion.version);
    core.setOutput("pre-release", currentVersion.prerelease.at(0));
    if (releasePullRequest) {
      await core.group("Release current version", () =>
        release(name, currentVersion, releasePullRequest),
      );
      core.setOutput("is-released", true);
      return true;
    } else {
      core.notice("No pull request to release.", {
        title: "No Release",
      });
    }
  } else {
    core.info("No current version.");
    core.setOutput("current-version", undefined);
    core.setOutput("pre-release", undefined);
  }
  core.setOutput("is-released", false);

  return false;
};

const tryPrepare = async (
  nextVersion: SemVer | null,
  releasePullRequest: PullRequest | undefined,
  releaseNotes: string | undefined,
  isManualVersion: boolean,
) => {
  if (!nextVersion || (!releaseNotes && !isManualVersion)) {
    core.notice("No changes since last release.", {
      title: "No Changes",
    });
    core.setOutput("next-version", undefined);
    core.setOutput("release-pr", undefined);
    return;
  }

  core.notice(`Next version is ${nextVersion.version}.`, {
    title: "Next Version",
  });
  core.setOutput("next-version", nextVersion.version);
  if (
    releasePullRequest?.title.includes(nextVersion.version) &&
    releaseNotes === releasePullRequest?.body
  ) {
    core.notice(
      `No new changes since the last check. Release PR #${releasePullRequest.number} is up to date.`,
      {
        title: "Up To Date",
      },
    );
    core.setOutput("release-pr", releasePullRequest?.number);
    return;
  }

  const prNumber = await core.group("Prepare", () =>
    prepare(
      nextVersion,
      releaseNotes ?? "",
      releasePullRequest,
      isManualVersion,
    ),
  );
  core.setOutput("release-pr", prNumber);
};

export const main = async () => {
  try {
    const {
      name,
      currentVersion,
      nextVersion,
      isManualVersion,
      mergedReleasePullRequest,
      openReleasePullRequest,
      releaseNotes,
    } = await core.group("Setup", setup);
    const isReleased = await tryRelease(
      name,
      currentVersion,
      mergedReleasePullRequest,
    );
    if (isReleased) {
      core.setOutput("next-version", undefined);
      core.setOutput("release-pr", undefined);

      return;
    }

    await tryPrepare(
      nextVersion,
      openReleasePullRequest,
      releaseNotes,
      isManualVersion,
    );
  } catch (error) {
    if (typeof error !== "string" && !(error instanceof Error)) {
      throw new Error("An unknown error type has been thrown.");
    }

    core.setFailed(error instanceof Error ? error.message : error);
  }
};
