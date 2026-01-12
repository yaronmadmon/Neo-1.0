import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { buildServer } from "./index.js";
import type { FastifyInstance } from "fastify";
import { NeoDaycareTemplate, NeoLawFirmTemplate } from "@neo/premium";

describe("Server", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    test("returns ok status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true });
    });
  });

  describe("GET /templates", () => {
    test("returns list of templates", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/templates"
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.templates)).toBe(true);
      expect(body.templates.length).toBeGreaterThan(0);
      expect(body.templates[0]).toHaveProperty("id");
      expect(body.templates[0]).toHaveProperty("name");
      expect(body.templates[0]).toHaveProperty("archetype");
    });
  });

  describe("GET /templates/:templateId", () => {
    test("returns daycare template", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/templates/neo_daycare_demo"
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.template).toEqual(NeoDaycareTemplate);
    });

    test("returns law firm template", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/templates/neo_law_demo"
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.template).toEqual(NeoLawFirmTemplate);
    });

    test("returns 404 for unknown template", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/templates/unknown_template"
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe("TemplateNotFound");
    });
  });

  describe("POST /publish", () => {
    test("accepts valid daycare template", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/publish",
        payload: NeoDaycareTemplate
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.publishedVersionId).toMatch(/^v_\d+$/);
      expect(typeof body.estimatedRenderCost).toBe("number");
    });

    test("accepts valid law firm template", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/publish",
        payload: NeoLawFirmTemplate
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.publishedVersionId).toMatch(/^v_\d+$/);
    });

    test("rejects invalid schema", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/publish",
        payload: { invalid: "data" }
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe("InvalidBlueprint");
      expect(body.details).toBeDefined();
    });

    test("rejects blueprint with premium gate failures", async () => {
      const invalidBlueprint = {
        ...NeoDaycareTemplate,
        theme: {
          tokens: {
            ...NeoDaycareTemplate.theme.tokens,
            colors: {
              ...NeoDaycareTemplate.theme.tokens.colors,
              text: "#FFFFFF",
              background: "#FFFFFF" // Low contrast
            }
          }
        }
      };

      const response = await app.inject({
        method: "POST",
        url: "/publish",
        payload: invalidBlueprint
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe("PremiumGateFailed");
      expect(Array.isArray(body.issues)).toBe(true);
      expect(body.issues.length).toBeGreaterThan(0);
      expect(typeof body.estimatedRenderCost).toBe("number");
    });

    test("rejects blueprint with invalid paletteId", async () => {
      const invalidBlueprint = {
        ...NeoDaycareTemplate,
        theme: {
          tokens: {
            ...NeoDaycareTemplate.theme.tokens,
            paletteId: "invalid_palette"
          }
        }
      };

      const response = await app.inject({
        method: "POST",
        url: "/publish",
        payload: invalidBlueprint
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe("PremiumGateFailed");
      expect(body.issues.some((issue: any) => issue.code === "curation.paletteId")).toBe(true);
    });
  });
});
