import { main } from "../src/main";
import { core, fileSystem } from "../tests/mocks";

describe("main()", () => {
  it("should fail when error", async () => {
    fileSystem.readFileSync.mockImplementationOnce(() => {
      throw new Error("Error");
    });

    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("Error while reading package.json."),
    );
  });
});
