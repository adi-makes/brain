import { describe, expect, it } from "vitest";
import { underDevelopmentMessage } from "./copy";

describe("underDevelopmentMessage", () => {
  it("states that the product is not ready", () => {
    expect(underDevelopmentMessage()).toBe("Second Brain is under development.");
  });
});
