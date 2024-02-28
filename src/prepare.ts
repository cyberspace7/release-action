import * as core from "@actions/core";
import { SemVer } from "semver";
import { inputs } from "./libs/inputs";
import { createNewNodePackageEncodedContent } from "./libs/node-package";
import {
  addLabelToReleasePullRequest,
  commentPullRequest,
  commitFileToReleaseBranch,
  createReleaseBranch,
  createReleasePullRequest,
  generateManualVersionComment,
  getNodePackageSha,
  getReleaseBranch,
  rebaseReleaseBranch,
  updateReleasePullRequest,
  type PullRequest,
} from "./libs/repository";

async function commitNodePackage(nextVersion: SemVer) {
  const sha = await getNodePackageSha();
  const content = createNewNodePackageEncodedContent(nextVersion);
  await commitFileToReleaseBranch(sha, content, nextVersion);
}

async function getOrCreateReleaseBranch() {
  if (await getReleaseBranch()) {
    return false;
  }

  await createReleaseBranch();
  core.notice(
    `Next release branch "${inputs.branches.release}" has been created.`,
    {
      title: "Branch Created",
    },
  );
  return true;
}

async function createOrUpdateReleasePullRequest(
  nextVersion: SemVer,
  releasePullRequest: PullRequest | null,
  releaseNotes: string,
  isManualVersion: boolean,
) {
  if (!releasePullRequest) {
    const newPullRequest = await createReleasePullRequest(
      nextVersion,
      releaseNotes,
    );
    await addLabelToReleasePullRequest(newPullRequest.number);
    core.notice(`Release PR #${newPullRequest.number} has been opened.`, {
      title: "PR Opened",
    });
    if (isManualVersion) {
      const comment = generateManualVersionComment(nextVersion);
      await commentPullRequest(newPullRequest.number, comment);
    }
    return newPullRequest.number;
  }

  await updateReleasePullRequest(releasePullRequest, nextVersion, releaseNotes);
  if (isManualVersion) {
    const comment = generateManualVersionComment(nextVersion);
    await commentPullRequest(releasePullRequest.number, comment);
  }
  core.notice(
    `The existing release PR #${releasePullRequest.number} has been updated.`,
    {
      title: "PR Updated",
    },
  );

  return releasePullRequest.number;
}

export async function prepare(
  nextVersion: SemVer,
  releaseNotes: string,
  releasePullRequest: PullRequest | null,
  isManualVersion: boolean,
) {
  core.info(`Preparing new release...`);

  let skipRebase = false;
  if (!releasePullRequest) {
    skipRebase = await getOrCreateReleaseBranch();
  }
  if (!skipRebase) {
    rebaseReleaseBranch();
  }

  if (!releasePullRequest?.title.includes(nextVersion.version)) {
    await commitNodePackage(nextVersion);
  }
  const prNumber = await createOrUpdateReleasePullRequest(
    nextVersion,
    releasePullRequest,
    releaseNotes,
    isManualVersion,
  );
  core.info(`New release prepared.`);

  return prNumber;
}
