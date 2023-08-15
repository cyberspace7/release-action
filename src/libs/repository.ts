import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { RequestError } from "@octokit/request-error";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { SemVer } from "semver";
import { tryExecute } from "./common";
import { environment } from "./inputs";
import { PACKAGE_FILE_NAME } from "./nodePackage";
import { getDiffMarkdown } from "./releaseNotes";

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
const DEFAULT_BRANCH_NAME = "main";
export const NEXT_RELEASE_BRANCH_NAME = "releases/next";

const owner = context.repo.owner;
const repo = context.repo.repo;

export const releaseLabels = {
  ignore: "changelog-ignore",
  patch: "type: fix",
  minor: "type: feature",
  major: "breaking",
  ready: "release: ready",
  done: "release: done",
} as const;

const getReleaseCommitMessage = (nextVersion: SemVer) => {
  return `chore(main): release ${RELEASE_TAG_PREFFIX}${nextVersion.version}`;
};

const getReleasePullRequestTitle = (nextVersion: SemVer) => {
  return `Release ${RELEASE_TAG_PREFFIX}${nextVersion}`;
};

export const generateManualVersionComment = (nextVersion: SemVer) => {
  return `Version \`${nextVersion.version}\` has been manually requested by @${context.actor}.`;
};

export const generateReleaseComment = (release: Release) => {
  const { name, html_url } = release;

  return `:package: [**${name}**](${html_url}) has been released.`;
};

export const generateReleasePullRequestUpdateComment = (
  oldContent: string,
  newContent: string,
) => {
  const markdownDiff = getDiffMarkdown(oldContent, newContent);

  return markdownDiff
    ? `Content has been updated:\n\n${markdownDiff}`
    : undefined;
};

export const getNodePackageSha = () => {
  return tryExecute(async () => {
    core.debug(`Getting ${PACKAGE_FILE_NAME} file SHA...`);
    const { data: contents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: PACKAGE_FILE_NAME,
      ref: `refs/heads/${NEXT_RELEASE_BRANCH_NAME}`,
    });
    const sha = "sha" in contents ? contents.sha : undefined;
    if (!sha) {
      throw new Error(`${PACKAGE_FILE_NAME} content not found.`);
    }
    core.debug(`${PACKAGE_FILE_NAME} file SHA: "${sha}".`);
    core.info(`${PACKAGE_FILE_NAME} file SHA retrieved.`);

    return sha;
  }, `Error while getting ${PACKAGE_FILE_NAME} file SHA.`);
};

export const getPullRequestsSinceLastRelease = () => {
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
      ({ data: pullRequests }, done) => {
        const releasePrIndex = pullRequests.findIndex(({ labels }) => {
          return labels.some(({ name }) => name === releaseLabels.done);
        });

        if (releasePrIndex > -1) {
          done();

          const prsAfterRelease = pullRequests.slice(0, releasePrIndex);
          core.debug(
            `${prsAfterRelease.length} pull request(s) loaded. Last Release pull request found.`,
          );
          return prsAfterRelease;
        }

        core.debug(`${pullRequests.length} pull request(s) loaded...`);
        return pullRequests;
      },
    );
    core.info(
      `${pullRequests.length} pull request(s) found since last release.`,
    );

    return pullRequests;
  }, "Error while getting pull requests since last release.");
};

export const getReleaseBranch = () => {
  return tryExecute(async () => {
    try {
      core.debug(`Getting branch "${NEXT_RELEASE_BRANCH_NAME}"...`);
      const { data: branch } = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: NEXT_RELEASE_BRANCH_NAME,
      });
      core.info(`Branch "${NEXT_RELEASE_BRANCH_NAME}" found.`);

      return branch;
    } catch (error) {
      if (
        (error as Error).name !== "HttpError" ||
        (error as RequestError).status !== 404
      ) {
        throw error;
      }

      core.info(`Branch "${NEXT_RELEASE_BRANCH_NAME}" not found.`);
      return undefined;
    }
  }, `Error while getting branch "${NEXT_RELEASE_BRANCH_NAME}".`);
};

export const getReleasePullRequest = (state: "open" | "merged") => {
  return tryExecute(async () => {
    core.debug(`Getting ${state} release pull request...`);
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: state === "open" ? "open" : "closed",
      head: NEXT_RELEASE_BRANCH_NAME,
      base: DEFAULT_BRANCH_NAME,
      sort: "updated",
      direction: "desc",
      per_page: 2,
    });
    const filteredPullRequests =
      state === "merged"
        ? pullRequests.filter(
            ({ labels, merged_at }) =>
              !!merged_at &&
              labels.some(({ name }) => name === releaseLabels.ready),
          )
        : pullRequests.filter(({ labels }) =>
            labels.some(({ name }) => name === releaseLabels.ready),
          );
    if (filteredPullRequests.length > 1) {
      core.warning(
        `More than one ${state} release pull request found. Using the last updated.`,
        {
          title: "Multiple Release PR",
        },
      );
    }
    const foundPullrequest = filteredPullRequests.at(0);
    core.info(
      `Release pull request (${state}) found: #${foundPullrequest?.number}.`,
    );

    return foundPullrequest;
  }, `Error while getting ${state} release pull request.`);
};

export const generateReleaseNotesForPullRequest = (nextVersion: SemVer) => {
  const tagName = `${RELEASE_TAG_PREFFIX}${nextVersion.version}`;

  return tryExecute(async () => {
    core.debug(`Generating release notes for ${tagName}...`);
    const {
      data: { body },
    } = await octokit.rest.repos.generateReleaseNotes({
      owner,
      repo,
      tag_name: tagName,
      target_commitish: context.sha,
    });
    core.info(`Release notes generated for ${tagName}.`);

    return body;
  }, `Error while generating release notes for ${tagName}.`);
};

export const createReleaseBranch = () => {
  return tryExecute(async () => {
    core.debug(`Creating branch "${NEXT_RELEASE_BRANCH_NAME}"...`);
    const { data: branch } = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${NEXT_RELEASE_BRANCH_NAME}`,
      sha: context.sha,
    });
    core.info(`Branch "${NEXT_RELEASE_BRANCH_NAME}" created.`);

    return branch;
  }, `Error while creating branch "${NEXT_RELEASE_BRANCH_NAME}".`);
};

export const commitFileToReleaseBranch = (
  sha: string,
  content: string,
  nextVersion: SemVer,
) => {
  return tryExecute(async () => {
    core.debug(`Commiting to branch "${NEXT_RELEASE_BRANCH_NAME}"...`);
    const { data: commit } =
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: PACKAGE_FILE_NAME,
        message: getReleaseCommitMessage(nextVersion),
        content,
        sha,
        branch: NEXT_RELEASE_BRANCH_NAME,
      });
    core.info(`Commit created to branch "${NEXT_RELEASE_BRANCH_NAME}".`);

    return commit;
  }, `Error while commiting to branch "${NEXT_RELEASE_BRANCH_NAME}".`);
};

export const createReleasePullRequest = (nextVersion: SemVer, body: string) => {
  const title = getReleasePullRequestTitle(nextVersion);

  return tryExecute(async () => {
    core.debug(`Creating release pull request "${title}"...`);
    const { data: pullRequest } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head: NEXT_RELEASE_BRANCH_NAME,
      base: DEFAULT_BRANCH_NAME,
      body,
    });
    core.info(
      `Release pull request "${title}" created: #${pullRequest.number}.`,
    );

    return pullRequest;
  }, `Error while creating release pull request "${title}".`);
};

export const createReleaseTag = (pullRequest: PullRequest, version: SemVer) => {
  return tryExecute(async () => {
    core.debug(`Creating release tag.`);
    const { merge_commit_sha, number } = pullRequest;
    if (!merge_commit_sha) {
      throw new Error(`Pull request #${number} has no merge commit SHA.`);
    }

    const tagName = `${RELEASE_TAG_PREFFIX}${version.version}`;
    const { data: tag } = await octokit.rest.git.createTag({
      owner,
      repo,
      tag: tagName,
      message: `Release ${tagName}`,
      object: merge_commit_sha,
      type: "commit",
    });
    core.info(`Release tag "${tag.tag}" created.`);

    return tag;
  }, `Error while creating release tag.`);
};

export const createRelease = (
  appName: string,
  tag: Tag,
  preRelease?: boolean | undefined,
) => {
  const releaseName = `${appName} ${tag.tag}`;

  return tryExecute(async () => {
    core.debug(`Creating release "${releaseName}"...`);
    const { data: release } = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag.tag,
      name: releaseName,
      generate_release_notes: true,
      prerelease: !!preRelease,
    });
    core.info(`Release "${release.name}" created.`);

    return release;
  }, `Error while creating release ${releaseName}.`);
};

export const addLabelToReleasePullRequest = (number: number) => {
  return tryExecute(async () => {
    core.debug(
      `Adding label "${releaseLabels.ready}" to release pull request #${number}...`,
    );
    const { data: updatedPullRequest } = await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: number,
      labels: [releaseLabels.ready],
    });
    core.info(
      `Label "${releaseLabels.ready}" added to release pull request #${number}.`,
    );

    return updatedPullRequest;
  }, `Error while adding label "${releaseLabels.ready}" to release pull request #${number}.`);
};

export const updateReleasePullRequest = (
  pullRequest: PullRequest,
  nextVersion: SemVer,
  body: string,
) => {
  const { number } = pullRequest;

  return tryExecute(async () => {
    core.debug(`Updating release pull request #${number}...`);
    const { data: updatedPullRequest } = await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: number,
      title: getReleasePullRequestTitle(nextVersion),
      body,
    });
    core.info(`Release pull request #${number} updated.`);

    return updatedPullRequest;
  }, `Error while updating release pull request #${number}.`);
};

export const completeReleasePullRequest = (pullRequest: PullRequest) => {
  const { number } = pullRequest;

  return tryExecute(async () => {
    core.debug(`Updating release pull request #${number}...`);
    const { data: updatedPullRequest } = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: number,
      labels: [releaseLabels.done],
    });
    core.info(`Release pull request #${number} updated.`);

    return updatedPullRequest;
  }, `Error while updating release pull request #${number}.`);
};

export const commentPullRequest = (number: number, body: string) => {
  return tryExecute(async () => {
    core.debug(`Adding comment to release pull request #${number}...`);
    const { data: comment } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body,
    });
    core.info(`Comment added to release pull request #${number}.`);

    return comment;
  }, `Error while adding comment to release pull request #${number}.`);
};
