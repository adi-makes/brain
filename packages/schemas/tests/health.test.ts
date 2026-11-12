import { describe, expect, it } from "vitest";
import { parseHealthResponse } from "../src/index";

describe("parseHealthResponse", () => {
  it("accepts a health payload", () => {
    expect(parseHealthResponse({ status: "ok", service: "frontend" })).toEqual({
      status: "ok",
      service: "frontend",
    });
  });

  it("rejects an unknown status", () => {
    expect(() => parseHealthResponse({ status: "up", service: "frontend" })).toThrow();
  });
});
