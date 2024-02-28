import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { RequestError } from "@octokit/request-error";
import type { RestEndpointMethodTypes } from "@octokit/rest";
import { SemVer } from "semver";
import { tryExecute } from "./common";
import { environment, inputs } from "./inputs";
import { PACKAGE_FILE_NAME } from "./node-package";

const octokit = getOctokit(environment.GITHUB_TOKEN);

export type PullRequest =
  RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number];
export type NewPullRequest =
  RestEndpointMethodTypes["pulls"]["create"]["response"]["data"];
export type Tag =
  RestEndpointMethodTypes["git"]["createTag"]["response"]["data"];
export type Release =
  RestEndpointMethodTypes["repos"]["createRelease"]["response"]["data"];

const RELEASE_TAG_PREFFIX = "v";

const owner = context.repo.owner;
const repo = context.repo.repo;

function getReleaseCommitMessage(nextVersion: SemVer) {
  return `chore(main): release ${RELEASE_TAG_PREFFIX}${nextVersion.version}`;
}

function getReleasePullRequestTitle(nextVersion: SemVer) {
  return `chore(main): release ${RELEASE_TAG_PREFFIX}${nextVersion.version}`;
}

export function generateManualVersionComment(nextVersion: SemVer) {
  return `Version \`${nextVersion.version}\` has been manually requested by @${context.actor}.`;
}

export function generateReleaseComment(release: Release) {
  return `:package: [**${release.name}**](${release.html_url}) has been released.`;
}

export function getNodePackageSha() {
  return tryExecute(async () => {
    core.debug(`Getting ${PACKAGE_FILE_NAME} file SHA...`);
    const content = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: PACKAGE_FILE_NAME,
      ref: `refs/heads/${inputs.branches.release}`,
    });
    const sha = "sha" in content.data ? content.data.sha : null;
    if (!sha) {
      throw new Error(`${PACKAGE_FILE_NAME} content not found.`);
    }

    core.debug(`${PACKAGE_FILE_NAME} file SHA: "${sha}".`);
    core.info(`${PACKAGE_FILE_NAME} file SHA retrieved.`);

    return sha;
  }, `Error while getting ${PACKAGE_FILE_NAME} file SHA.`);
}

export function getPullRequestsSinceLastRelease() {
  return tryExecute(async () => {
    core.debug("Getting pull requests since last release...");
    const pullRequests = await octokit.paginate(
      octokit.rest.pulls.list,
      {
        owner,
        repo,
        state: "closed",
        sort: "updated",
        direction: "desc",
      },
      (pullRequests, done) => {
        const releasePrIndex = pullRequests.data.findIndex((pullRequest) => {
          return pullRequest.labels.some(
            ({ name }) => name === inputs.releaseLabels.done,
          );
        });

        if (releasePrIndex > -1) {
          done();

          const prsAfterRelease = pullRequests.data.slice(0, releasePrIndex);
          core.debug(
            `${prsAfterRelease.length} pull request(s) loaded. Last Release pull request found.`,
          );
          return prsAfterRelease;
        }

        core.debug(`${pullRequests.data.length} pull request(s) loaded...`);
        return pullRequests.data;
      },
    );
    core.info(
      `${pullRequests.length} pull request(s) found since last release.`,
    );

    return pullRequests;
  }, "Error while getting pull requests since last release.");
}

export function getReleaseBranch() {
  return tryExecute(async () => {
    try {
      core.debug(`Getting branch "${inputs.branches.release}"...`);
      const branch = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: inputs.branches.release,
      });
      core.info(`Branch "${inputs.branches.release}" found.`);

      return branch.data;
    } catch (error) {
      if (
        (error as Error).name !== "HttpError" ||
        (error as RequestError).status !== 404
      ) {
        throw error;
      }

      core.info(`Branch "${inputs.branches.release}" not found.`);
      return null;
    }
  }, `Error while getting branch "${inputs.branches.release}".`);
}

export function getReleasePullRequest(state: "open" | "merged") {
  return tryExecute(async () => {
    core.debug(`Getting ${state} release pull request...`);
    const pullRequests = await octokit.rest.pulls.list({
      owner,
      repo,
      state: state === "open" ? "open" : "closed",
      head: inputs.branches.release,
      base: inputs.branches.production,
      sort: "updated",
      direction: "desc",
      per_page: 2,
    });
    const filteredPullRequests =
      state === "merged"
        ? pullRequests.data.filter(
            (pullRequest) =>
              !!pullRequest.merged_at &&
              pullRequest.labels.some(
                (label) => label.name === inputs.releaseLabels.ready,
              ),
          )
        : pullRequests.data.filter((pullRequest) =>
            pullRequest.labels.some(
              (label) => label.name === inputs.releaseLabels.ready,
            ),
          );
    if (filteredPullRequests.length > 1) {
      core.warning(
        `More than one ${state} release pull request found. Using the last updated.`,
        {
          title: "Multiple Release PR",
        },
      );
    }
    const foundPullrequest = filteredPullRequests.at(0) ?? null;
    core.info(
      `Release pull request (${state}) found: #${foundPullrequest?.number}.`,
    );

    return foundPullrequest;
  }, `Error while getting ${state} release pull request.`);
}

export function generateReleaseNotesForPullRequest(nextVersion: SemVer) {
  const tagName = `${RELEASE_TAG_PREFFIX}${nextVersion.version}`;

  return tryExecute(async () => {
    core.debug(`Generating release notes for ${tagName}...`);
    const releaseNote = await octokit.rest.repos.generateReleaseNotes({
      owner,
      repo,
      tag_name: tagName,
      target_commitish: context.sha,
    });
    core.info(`Release notes generated for ${tagName}.`);

    return releaseNote.data.body;
  }, `Error while generating release notes for ${tagName}.`);
}

export function createReleaseBranch() {
  return tryExecute(async () => {
    core.debug(`Creating branch "${inputs.branches.release}"...`);
    const branch = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${inputs.branches.release}`,
      sha: context.sha,
    });
    core.info(`Branch "${inputs.branches.release}" created.`);

    return branch.data;
  }, `Error while creating branch "${inputs.branches.release}".`);
}

export function commitFileToReleaseBranch(
  sha: string,
  content: string,
  nextVersion: SemVer,
) {
  return tryExecute(async () => {
    core.debug(`Commiting to branch "${inputs.branches.release}"...`);
    const contents = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: PACKAGE_FILE_NAME,
      message: getReleaseCommitMessage(nextVersion),
      content,
      sha,
      branch: inputs.branches.release,
    });
    core.info(`Commit created to branch "${inputs.branches.release}".`);

    return contents.data.commit;
  }, `Error while commiting to branch "${inputs.branches.release}".`);
}

export function createReleasePullRequest(nextVersion: SemVer, body: string) {
  const title = getReleasePullRequestTitle(nextVersion);

  return tryExecute(async () => {
    core.debug(`Creating release pull request "${title}"...`);
    const pullRequest = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head: inputs.branches.release,
      base: inputs.branches.production,
      body,
    });
    core.info(
      `Release pull request "${title}" created: #${pullRequest.data.number}.`,
    );

    return pullRequest.data;
  }, `Error while creating release pull request "${title}".`);
}

export function createReleaseTag(pullRequest: PullRequest, version: SemVer) {
  return tryExecute(async () => {
    core.debug(`Creating release tag.`);
    if (!pullRequest.merge_commit_sha) {
      throw new Error(
        `Pull request #${pullRequest.number} has no merge commit SHA.`,
      );
    }

    const tagName = `${RELEASE_TAG_PREFFIX}${version.version}`;
    const tag = await octokit.rest.git.createTag({
      owner,
      repo,
      tag: tagName,
      message: `Release ${tagName}`,
      object: pullRequest.merge_commit_sha,
      type: "commit",
    });
    core.info(`Release tag "${tag.data.tag}" created.`);

    return tag.data;
  }, `Error while creating release tag.`);
}

export function createRelease(appName: string, tag: Tag, preRelease?: boolean) {
  const releaseName = `${appName} ${tag.tag}`;

  return tryExecute(async () => {
    core.debug(`Creating release "${releaseName}"...`);
    const release = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag.tag,
      name: releaseName,
      generate_release_notes: true,
      prerelease: !!preRelease,
    });
    core.info(`Release "${release.data.name}" created.`);

    return release.data;
  }, `Error while creating release ${releaseName}.`);
}

export function addLabelToReleasePullRequest(number: number) {
  return tryExecute(async () => {
    core.debug(
      `Adding label "${inputs.releaseLabels.ready}" to release pull request #${number}...`,
    );
    const updatedPullRequest = await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: number,
      labels: [inputs.releaseLabels.ready],
    });
    core.info(
      `Label "${inputs.releaseLabels.ready}" added to release pull request #${number}.`,
    );

    return updatedPullRequest.data;
  }, `Error while adding label "${inputs.releaseLabels.ready}" to release pull request #${number}.`);
}

export function mergeIntoReleaseBranch() {
  return tryExecute(async () => {
    core.debug(
      `Merging branch "${inputs.branches.production}" into "${inputs.branches.release}"...`,
    );
    const merge = await octokit.rest.repos.merge({
      owner,
      repo,
      base: inputs.branches.release,
      head: inputs.branches.production,
      commit_message: `chore(main): merge "${inputs.branches.production}"`,
    });
    core.info(
      `Branch "${inputs.branches.production}" merged into "${inputs.branches.release}".`,
    );
    return merge.data;
  }, `Error while merging branch "${inputs.branches.production}" into "${inputs.branches.release}".`);
}

export function updateReleasePullRequest(
  pullRequest: PullRequest,
  nextVersion: SemVer,
  body: string,
) {
  return tryExecute(async () => {
    core.debug(`Updating release pull request #${pullRequest.number}...`);
    const updatedPullRequest = await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: pullRequest.number,
      title: getReleasePullRequestTitle(nextVersion),
      body,
    });
    core.info(`Release pull request #${pullRequest.number} updated.`);

    return updatedPullRequest.data;
  }, `Error while updating release pull request #${pullRequest.number}.`);
}

export function completeReleasePullRequest(pullRequest: PullRequest) {
  return tryExecute(async () => {
    core.debug(`Updating release pull request #${pullRequest.number}...`);
    const updatedPullRequest = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: pullRequest.number,
      labels: [inputs.releaseLabels.done],
    });
    core.info(`Release pull request #${pullRequest.number} updated.`);

    return updatedPullRequest.data;
  }, `Error while updating release pull request #${pullRequest.number}.`);
}

export function commentPullRequest(number: number, body: string) {
  return tryExecute(async () => {
    core.debug(`Adding comment to release pull request #${number}...`);
    const comment = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body,
    });
    core.info(`Comment added to release pull request #${number}.`);

    return comment.data;
  }, `Error while adding comment to release pull request #${number}.`);
}
