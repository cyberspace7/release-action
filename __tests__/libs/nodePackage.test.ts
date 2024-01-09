import { SemVer } from "semver";
import {
  createNewNodePackageEncodedContent,
  getNodePackage,
} from "../../src/libs/nodePackage";
import { fileSystem } from "../../tests/mocks";

describe("getNodePackage()", () => {
  describe("when `name`", () => {
    it("should return value when `n-a_me1`", () => {
      fileSystem.readFileSync.mockReturnValueOnce(`{"name": "n-a_me1"}`);

      const result = getNodePackage();

      expect(result?.name).toEqual("n-a_me1");
    });

    it("should return value when `@o-w_ner2/n-a_me1`", () => {
      fileSystem.readFileSync.mockReturnValueOnce(
        `{"name": "@o-w_ner2/n-a_me1"}`,
      );

      const result = getNodePackage();

      expect(result?.name).toEqual("n-a_me1");
    });

    test.each([
      "na|me",
      "name!",
      "na me",
      "owner/name",
      "@ow/ner/name",
      "@owner!/name",
      "ow ner/name",
    ])("should throw when `%s`", (value) => {
      fileSystem.readFileSync.mockReturnValueOnce(`{"name": "${value}`);

      expect(getNodePackage).toThrow();
    });
  });

  describe("when `version`", () => {
    it("should return value when `1.2.3-alpha.4`", () => {
      fileSystem.readFileSync.mockReturnValueOnce(
        '{"name": "name", "version": "1.2.3-alpha.4"}',
      );

      const result = getNodePackage();

      expect(result?.version?.version).toEqual("1.2.3-alpha.4");
    });

    it("should return `null` when empty", () => {
      fileSystem.readFileSync.mockReturnValueOnce(
        '{"name": "name", "version": ""}',
      );

      const result = getNodePackage();

      expect(result?.version).toEqual(null);
    });

    it("should throw when `test`", () => {
      fileSystem.readFileSync.mockReturnValueOnce(
        '{"name": "name", "version": "test"}',
      );

      expect(getNodePackage).toThrow();
    });
  });
});

describe("createNewNodePackageEncodedContent()", () => {
  it("should return content when version defined", () => {
    fileSystem.readFileSync.mockReturnValue(
      '{"name": "@owner/application", "version": "1.2.3-alpha.4", "bugs": { "url": "http://bugs.com", "email": "bugs@email.com" }, "author": { "name": "Name", "email": "name@email.com", "url": "http://name.com" }, "dependencies": {}}',
    );

    const result = createNewNodePackageEncodedContent(new SemVer("1.3.0"));

    expect(result).toEqual(
      "ewogICJuYW1lIjogIkBvd25lci9hcHBsaWNhdGlvbiIsCiAgInZlcnNpb24iOiAiMS4zLjAiLAogICJidWdzIjogewogICAgInVybCI6ICJodHRwOi8vYnVncy5jb20iLAogICAgImVtYWlsIjogImJ1Z3NAZW1haWwuY29tIgogIH0sCiAgImF1dGhvciI6IHsKICAgICJuYW1lIjogIk5hbWUiLAogICAgImVtYWlsIjogIm5hbWVAZW1haWwuY29tIiwKICAgICJ1cmwiOiAiaHR0cDovL25hbWUuY29tIgogIH0sCiAgImRlcGVuZGVuY2llcyI6IHt9Cn0K",
    );
  });

  it("should return content when version undefined", () => {
    fileSystem.readFileSync.mockReturnValue(
      '{"name": "@owner/application", "bugs": { "url": "http://bugs.com", "email": "bugs@email.com" }, "author": { "name": "Name", "email": "name@email.com", "url": "http://name.com" }, "dependencies": {}}',
    );

    const result = createNewNodePackageEncodedContent(new SemVer("1.3.0"));

    expect(result).toEqual(
      "ewogICJuYW1lIjogIkBvd25lci9hcHBsaWNhdGlvbiIsCiAgImJ1Z3MiOiB7CiAgICAidXJsIjogImh0dHA6Ly9idWdzLmNvbSIsCiAgICAiZW1haWwiOiAiYnVnc0BlbWFpbC5jb20iCiAgfSwKICAiYXV0aG9yIjogewogICAgIm5hbWUiOiAiTmFtZSIsCiAgICAiZW1haWwiOiAibmFtZUBlbWFpbC5jb20iLAogICAgInVybCI6ICJodHRwOi8vbmFtZS5jb20iCiAgfSwKICAiZGVwZW5kZW5jaWVzIjoge30sCiAgInZlcnNpb24iOiAiMS4zLjAiCn0K",
    );
  });
});
