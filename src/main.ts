import * as core from "@actions/core";
import { SemVer } from "semver";
import type { PullRequest } from "./libs/repository";
import { prepare } from "./prepare";
import { release } from "./release";
import { setup } from "./setup";

async function tryRelease(
  name: string,
  currentVersion: SemVer | null,
  releasePullRequest: PullRequest | null,
) {
  if (currentVersion) {
    core.info(`Current version: ${currentVersion.version}`);
    core.setOutput("current-version", currentVersion.version);
    core.setOutput("pre-release", currentVersion.prerelease.at(0) ?? null);
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
    core.setOutput("current-version", null);
    core.setOutput("pre-release", null);
  }
  core.setOutput("is-released", false);

  return false;
}

async function tryPrepare(
  nextVersion: SemVer | null,
  releasePullRequest: PullRequest | null,
  releaseNotes: string | null,
  isManualVersion: boolean,
) {
  if (!nextVersion || (!releaseNotes && !isManualVersion)) {
    core.notice("No changes since last release.", {
      title: "No Changes",
    });
    core.setOutput("next-version", null);
    core.setOutput("release-pr", null);
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
}

export async function main() {
  try {
    const context = await core.group("Setup", setup);
    const isReleased = await tryRelease(
      context.name,
      context.currentVersion,
      context.mergedReleasePullRequest,
    );
    if (isReleased) {
      core.setOutput("next-version", null);
      core.setOutput("release-pr", null);

      return;
    }

    await tryPrepare(
      context.nextVersion,
      context.openReleasePullRequest,
      context.releaseNotes,
      context.isManualVersion,
    );
  } catch (error) {
    if (typeof error !== "string" && !(error instanceof Error)) {
      throw new Error("An unknown error type has been thrown.");
    }

    core.setFailed(error instanceof Error ? error.message : error);
  }
}
