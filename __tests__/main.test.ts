import { main } from "../src/main";
import { core, fileSystem } from "../tests/mocks";

const { readFileSync } = fileSystem;
const { setFailed } = core;

describe("main()", () => {
  it("should fail when error", async () => {
    readFileSync.mockImplementationOnce(() => {
      throw new Error("Error");
    });

    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(setFailed).toHaveBeenCalledWith(
      expect.stringContaining("Error while reading package.json."),
    );
  });
});
