import * as core from "@actions/core";
import { SemVer } from "semver";
import { inputs } from "./libs/inputs";
import { createNewNodePackageEncodedContent } from "./libs/nodePackage";
import {
  addLabelToReleasePullRequest,
  commentPullRequest,
  commitFileToReleaseBranch,
  createReleaseBranch,
  createReleasePullRequest,
  generateManualVersionComment,
  generateReleasePullRequestUpdateComment,
  getNodePackageSha,
  getReleaseBranch,
  mergeIntoReleaseBranch,
  PullRequest,
  updateReleasePullRequest,
} from "./libs/repository";

const commitNodePackage = async (nextVersion: SemVer) => {
  const sha = await getNodePackageSha();
  const content = createNewNodePackageEncodedContent(nextVersion);
  await commitFileToReleaseBranch(sha, content, nextVersion);
};

const getOrCreateReleaseBranch = async () => {
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
};

const createOrUpdateReleasePullRequest = async (
  nextVersion: SemVer,
  releasePullRequest: PullRequest | undefined,
  releaseNotes: string,
  isManualVersion: boolean,
) => {
  if (!releasePullRequest) {
    const { number } = await createReleasePullRequest(
      nextVersion,
      releaseNotes,
    );
    await addLabelToReleasePullRequest(number);
    core.notice(`Release PR #${number} has been opened.`, {
      title: "PR Opened",
    });
    if (isManualVersion) {
      const comment = generateManualVersionComment(nextVersion);
      await commentPullRequest(number, comment);
    }
    return number;
  }

  const { number, body } = releasePullRequest;
  await updateReleasePullRequest(releasePullRequest, nextVersion, releaseNotes);
  const diffComment = generateReleasePullRequestUpdateComment(
    body || "",
    releaseNotes,
  );
  if (diffComment || isManualVersion) {
    const manualVersionComment = isManualVersion
      ? generateManualVersionComment(nextVersion)
      : "";
    const comment = [manualVersionComment, diffComment]
      .filter((value) => !!value)
      .join("\n\n");
    await commentPullRequest(number, comment);
  }
  core.notice(`The existing release PR #${number} has been updated.`, {
    title: "PR Updated",
  });

  return releasePullRequest.number;
};

export const prepare = async (
  nextVersion: SemVer,
  releaseNotes: string,
  releasePullRequest: PullRequest | undefined,
  isManualVersion: boolean,
) => {
  core.info(`Preparing new release...`);

  let skipMerge = false;
  if (!releasePullRequest) {
    skipMerge = await getOrCreateReleaseBranch();
  }
  if (!skipMerge) {
    await mergeIntoReleaseBranch();
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
};
