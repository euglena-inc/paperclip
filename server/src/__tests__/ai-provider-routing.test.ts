import { describe, it, expect } from "vitest";
import {
  aiProviderRoutingSchema,
  createAiConnectionSchema,
  isAiConnectionCompatible,
  aiRoutingHarness,
  aiRoutingModel,
} from "@paperclipai/shared";
import { managedProviderRouting } from "../services/ai-provider-routing.js";

describe("provider routing", () => {
  it.each([
    "https://user:secret@gateway.example/v1",
    "https://gateway.example/v1?key=secret",
    "http://169.254.169.254/",
    "file:///tmp/secret",
    "https://gateway.example/#secret",
  ])("rejects unsafe or credential-bearing endpoint %s", (baseUrl) => {
    expect(
      aiProviderRoutingSchema.safeParse({
        kind: "gateway",
        protocol: "responses",
        baseUrl,
      }).success,
    ).toBe(false);
  });
  it("requires exactly the selected credential and disallows routed subscriptions", () => {
    const input = {
      provider: "openai",
      method: "api_key",
      name: "Local",
      ownership: "personal",
      routing: {
        kind: "local",
        protocol: "responses",
        auth: "none",
        baseUrl: "http://localhost:11434/v1",
      },
    };
    expect(createAiConnectionSchema.safeParse(input).success).toBe(true);
    expect(
      createAiConnectionSchema.safeParse({ ...input, apiKey: "unwanted" })
        .success,
    ).toBe(false);
    expect(
      createAiConnectionSchema.safeParse({
        ...input,
        method: "subscription",
        loginSessionId: "session",
      }).success,
    ).toBe(false);
  });
  it("rejects unsupported protocols and excluded remote adapters", () => {
    const routing = aiProviderRoutingSchema.parse({
      kind: "gateway",
      protocol: "chat",
      baseUrl: "https://gateway.example/v1",
    });
    for (const adapter of [
      "codex_local",
      "claude_local",
      "http",
      "process",
      "openclaw_gateway",
      "hermes_gateway",
      "acpx_local",
    ])
      expect(
        isAiConnectionCompatible(
          { provider: "openai", method: "api_key", routing },
          adapter,
        ),
      ).toBe(false);
    expect(
      isAiConnectionCompatible(
        { provider: "openai", method: "api_key", routing },
        "opencode_local",
      ),
    ).toBe(true);
    expect(
      isAiConnectionCompatible(
        { provider: "openai", method: "api_key", routing },
        "paperclip_runner",
        "model",
        "aws_agentcore",
      ),
    ).toBe(false);
  });
  it.each(["gateway", "openrouter"] as const)("uses a terminal-filtered secret variable for Hermes %s authentication", kind => {
    const route = aiProviderRoutingSchema.parse({ kind, protocol: "chat", auth: "bearer", ...(kind === "gateway" ? { baseUrl: "https://gateway.example/v1" } : {}) });
    const projected = managedProviderRouting(route, "hermes_local", "selected-key", "fixture-model");
    expect(projected.env.OPENAI_API_KEY).toBe("selected-key");
    expect(projected.env.PAPERCLIP_AI_PROVIDER_KEY).toBeUndefined();
    expect(projected.hermesConfig).toContain('api_key: "${OPENAI_API_KEY}"');
    expect(projected.hermesConfig).not.toContain("selected-key");
    expect(Object.entries(projected.env).filter(([, value]) => value === "selected-key").map(([name]) => name)).toEqual(kind === "openrouter" ? ["OPENAI_API_KEY", "OPENROUTER_API_KEY"] : ["OPENAI_API_KEY"]);
  });
  it("routes OpenRouter through each harness's protocol without putting secrets in Codex config", () => {
    const routing = aiProviderRoutingSchema.parse({
      kind: "openrouter",
      protocol: "responses",
    });
    const codex = managedProviderRouting(
      routing,
      "codex_local",
      "fixture-secret",
      "openai/gpt-5.4",
    );
    expect(codex.codexConfig).toContain('wire_api = "responses"');
    expect(codex.codexConfig).not.toContain("fixture-secret");
    const claude = managedProviderRouting(
      routing,
      "claude_local",
      "fixture-secret",
      "anthropic/claude-sonnet-4.6",
    );
    expect(claude.env.ANTHROPIC_BASE_URL).toBe("https://openrouter.ai/api");
    expect(claude.env.ANTHROPIC_AUTH_TOKEN).toBe("fixture-secret");
    expect(claude.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe(
      "anthropic/claude-sonnet-4.6",
    );
    const opencode = managedProviderRouting(
      routing,
      "opencode_local",
      "fixture-secret",
      "anthropic/claude-sonnet-4.6",
    );
    expect(opencode.config.model).toBe(
      "openrouter/anthropic/claude-sonnet-4.6",
    );
  });
  it("projects only a Bedrock API key and rejects general AWS access keys", () => {
    const routing = aiProviderRoutingSchema.parse({
      kind: "bedrock",
      protocol: "bedrock",
      auth: "bearer",
      region: "us-east-1",
    });
    const projected = managedProviderRouting(
      routing,
      "claude_local",
      "fixture-bedrock-key",
      "bedrock-model",
    );
    expect(projected.env).toMatchObject({
      CLAUDE_CODE_USE_BEDROCK: "1",
      AWS_REGION: "us-east-1",
      AWS_BEARER_TOKEN_BEDROCK: "fixture-bedrock-key",
      AWS_EC2_METADATA_DISABLED: "true",
    });
    expect(aiProviderRoutingSchema.safeParse({ ...routing, auth: "aws_credentials" }).success).toBe(false);
    for (const key of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"]) expect(projected.env).not.toHaveProperty(key);
  });
  it.each(["pi_local", "grok_local"])("accepts Chat gateways only for %s and its Runner profile", harness => {
    const route = aiProviderRoutingSchema.parse({ kind: "gateway", protocol: "chat", baseUrl: "https://gateway.example/v1" });
    const metadata = { provider: "openai", method: "api_key", routing: route } as const;
    expect(isAiConnectionCompatible(metadata, harness)).toBe(true);
    const agent = harness.replace("_local", "");
    expect(aiRoutingHarness("paperclip_runner", "acpx", agent)).toBe(harness);
    expect(isAiConnectionCompatible(metadata, "paperclip_runner", "model", "acpx", agent)).toBe(true);
    for (const protocol of ["responses", "messages"] as const) {
      expect(isAiConnectionCompatible({ ...metadata, routing: { ...route, protocol } }, harness)).toBe(false);
    }
  });
  it("registers an explicit Pi model even when the saved gateway catalog is empty", () => {
    const route = aiProviderRoutingSchema.parse({ kind: "gateway", protocol: "chat", baseUrl: "https://gateway.example/v1" });
    const projected = managedProviderRouting(route, "pi_local", "fixture-pi-secret", "paperclip/private/model");
    const providers = JSON.parse(projected.env.PAPERCLIP_PI_PROVIDERS);
    expect(projected.config.model).toBe("paperclip/private/model");
    expect(aiRoutingModel(route, "pi_local", "paperclip/private/model")).toBe("paperclip/private/model");
    expect(providers.paperclip.models).toEqual([expect.objectContaining({ id: "private/model" })]);
    expect(providers.paperclip.apiKey).toBe("${OPENAI_API_KEY}");
    expect(projected.env.OPENAI_API_KEY).toBe("fixture-pi-secret");
    expect(projected.env.PAPERCLIP_PI_PROVIDERS).not.toContain("fixture-pi-secret");
    const catalogued = managedProviderRouting({ ...route, models: [{ id: "private/model" }] }, "pi_local", "fixture", "paperclip/private/model");
    expect(JSON.parse(catalogued.env.PAPERCLIP_PI_PROVIDERS).paperclip.models).toHaveLength(1);
  });
  it("projects Grok custom discovery to the selected gateway only", () => {
    const route = aiProviderRoutingSchema.parse({ kind: "gateway", protocol: "chat", baseUrl: "https://gateway.example/v1/" });
    const projected = managedProviderRouting(route, "grok_local", "fixture-grok-secret", "private-model");
    expect(projected.env).toEqual({ GROK_MODELS_BASE_URL: "https://gateway.example/v1", XAI_API_KEY: "fixture-grok-secret" });
    expect(projected.config.model).toBe("private-model");
  });
  it.each(["pi_local", "grok_local"])("does not fall back to ambient authentication for a no-auth %s endpoint", harness => {
    const route = aiProviderRoutingSchema.parse({ kind: "local", protocol: "chat", auth: "none", baseUrl: "http://localhost:1234/v1" });
    const projected = managedProviderRouting(route, harness, "", "fixture-model");
    expect(projected.env[harness === "pi_local" ? "OPENAI_API_KEY" : "XAI_API_KEY"]).toBe("paperclip-no-auth");
  });

});
