import * as core from "@actions/core";

export function tryExecute<T>(fn: () => T, errorMessage: string) {
  try {
    return fn();
  } catch (error) {
    if (typeof error !== "string" && !(error instanceof Error)) {
      throw error;
    }

    core.error(error);
    throw new Error(errorMessage);
  }
}
