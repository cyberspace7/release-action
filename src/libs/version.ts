import * as _ from "lodash-es";
import { SemVer } from "semver";
import { inputs } from "./inputs";
import type { PullRequest } from "./repository";

export function createNewVersion() {
  return new SemVer("0.0.0");
}

export function getVersionBumpLevel(
  pullRequests: PullRequest[],
  currentVersion: SemVer | null,
) {
  const isStable = (currentVersion?.major ?? 0) > 0;
  const bumpLevels = pullRequests.map((pullRequest) => {
    const bumpLabels = pullRequest.labels
      .filter((label) => {
        const labels = Object.values(inputs.releaseLabels);
        return labels.some((labels) => {
          return labels.includes(label.name);
        });
      })
      .map((label) => label.name);

    if (_.intersection(bumpLabels, inputs.releaseLabels.ignore).length > 0) {
      return 0;
    }

    if (_.intersection(bumpLabels, inputs.releaseLabels.major).length > 0) {
      return isStable ? 3 : 2;
    }

    if (_.intersection(bumpLabels, inputs.releaseLabels.minor).length > 0) {
      return 2;
    }

    if (_.intersection(bumpLabels, inputs.releaseLabels.patch).length > 0) {
      return 1;
    }

    return 0;
  });

  return Math.max(0, ...bumpLevels);
}

export function getNextVersion(
  currentVersion: SemVer | null,
  bumpLevel: number,
  preRelease?: string,
) {
  const version = currentVersion
    ? new SemVer(currentVersion.version)
    : createNewVersion();

  if (preRelease) {
    switch (bumpLevel) {
      case 0:
        return version.inc("prerelease", preRelease);
      case 1:
        return version.inc("prepatch", preRelease);
      case 2:
        return version.inc("preminor", preRelease);
      case 3:
        return version.inc("premajor", preRelease);
      default:
        throw new Error(`Invalid bump level: ${bumpLevel}.`);
    }
  }

  if (bumpLevel === 0) {
    return null;
  }

  switch (bumpLevel) {
    case 1:
      return version.inc("patch");
    case 2:
      return version.inc("minor");
    case 3:
      return version.inc("major");
    default:
      throw new Error(`Invalid bump level: ${bumpLevel}.`);
  }
}
