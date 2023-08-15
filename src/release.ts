import * as core from "@actions/core";
import { SemVer } from "semver";
import {
  commentPullRequest,
  completeReleasePullRequest,
  createRelease,
  createReleaseTag,
  generateReleaseComment,
  PullRequest,
} from "./libs/repository";

export const release = async (
  appName: string,
  currentVersion: SemVer,
  releasePullRequest: PullRequest,
) => {
  core.info(`Releasing version ${currentVersion.version}...`);
  const tag = await createReleaseTag(releasePullRequest, currentVersion);
  core.notice(`Release tag ${tag.tag} created.`, {
    title: "Tag Created",
  });
  const release = await createRelease(
    appName,
    tag,
    currentVersion.prerelease.length > 0,
  );
  core.notice(`Release ${release.name} created.`, {
    title: "Release Created",
  });
  await completeReleasePullRequest(releasePullRequest);
  const comment = generateReleaseComment(release);
  await commentPullRequest(releasePullRequest.number, comment);
  core.info("Release completed.");
};
