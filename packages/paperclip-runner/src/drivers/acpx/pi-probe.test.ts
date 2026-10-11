import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ close: vi.fn(), openCommand: vi.fn(), verify: vi.fn() }));
vi.mock("./pi-installation.js", () => ({ verifyPiInstallation: mocks.verify }));
import { probeAcpxPiInstallation } from "./installation-integrity.js";

describe("Pi installation probe", () => {
  it("uses the pinned distribution verifier and releases its snapshot lease", async () => {
    mocks.openCommand.mockResolvedValue({ close: mocks.close });
    mocks.verify.mockResolvedValue({ openCommand: mocks.openCommand });
    await probeAcpxPiInstallation("paperclip/qwen38");
    expect(mocks.verify).toHaveBeenCalledWith(expect.objectContaining({ agent: "pi" }));
    expect(mocks.openCommand).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
