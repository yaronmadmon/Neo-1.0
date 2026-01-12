import { describe, expect, test } from "vitest";
import { AppBlueprintSchema } from "@neo/contracts";
import { validatePremiumQuality, contrastRatio } from "./premium_gate.js";
import { NeoDaycareTemplate } from "./templates/neo_daycare.js";
import { NeoLawFirmTemplate } from "./templates/neo_law_firm.js";

describe("Premium Quality Gate (golden templates)", () => {
  test("daycare template is schema-valid and premium", () => {
    const parsed = AppBlueprintSchema.parse(NeoDaycareTemplate);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(true);
  });

  test("law firm template is schema-valid and premium", () => {
    const parsed = AppBlueprintSchema.parse(NeoLawFirmTemplate);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(true);
  });
});

describe("Premium Quality Gate - Curation", () => {
  test("rejects invalid paletteId", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      theme: {
        tokens: {
          ...NeoDaycareTemplate.theme.tokens,
          paletteId: "invalid_palette"
        }
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "curation.paletteId")).toBe(true);
  });

  test("rejects invalid tokenSetId", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      theme: {
        tokens: {
          ...NeoDaycareTemplate.theme.tokens,
          tokenSetId: "invalid_tokens"
        }
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "curation.tokenSetId")).toBe(true);
  });

  test("rejects invalid fontFamilyId", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      theme: {
        tokens: {
          ...NeoDaycareTemplate.theme.tokens,
          typography: {
            ...NeoDaycareTemplate.theme.tokens.typography,
            fontFamilyId: "invalid_font"
          }
        }
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "curation.fontFamilyId")).toBe(true);
  });

  test("rejects invalid iconId in navigation", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      navigation: {
        ...NeoDaycareTemplate.navigation,
        routes: [
          {
            ...NeoDaycareTemplate.navigation.routes[0],
            iconId: "invalid_icon"
          }
        ]
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "curation.iconId")).toBe(true);
  });
});

describe("Premium Quality Gate - Accessibility", () => {
  test("rejects low contrast text/background", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      theme: {
        tokens: {
          ...NeoDaycareTemplate.theme.tokens,
          colors: {
            ...NeoDaycareTemplate.theme.tokens.colors,
            text: "#FFFFFF",
            background: "#FFFFFF"
          }
        }
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "a11y.contrast")).toBe(true);
  });

  test("rejects low contrast primaryText/primary", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      theme: {
        tokens: {
          ...NeoDaycareTemplate.theme.tokens,
          colors: {
            ...NeoDaycareTemplate.theme.tokens.colors,
            primary: "#808080",
            primaryText: "#808080"
          }
        }
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "a11y.contrast")).toBe(true);
  });

  test("contrastRatio function calculates correctly", () => {
    // Black on white should have high contrast
    expect(contrastRatio("#000000", "#FFFFFF")).toBeGreaterThan(20);
    // White on white should have low contrast
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 2);
    // Standard black on white
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });
});

describe("Premium Quality Gate - UX", () => {
  test("rejects list screen without empty state", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      screens: [
        {
          ...NeoDaycareTemplate.screens[1], // kids_list
          states: {
            ...NeoDaycareTemplate.screens[1].states,
            empty: undefined
          }
        }
      ]
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "ux.missingEmptyState")).toBe(true);
  });

  test("rejects duplicate screen ids", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      screens: [
        ...NeoDaycareTemplate.screens,
        { ...NeoDaycareTemplate.screens[0], id: NeoDaycareTemplate.screens[0].id }
      ]
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "ux.navigation" && i.message.includes("Duplicate screen"))).toBe(true);
  });

  test("rejects duplicate route ids", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      navigation: {
        ...NeoDaycareTemplate.navigation,
        routes: [
          ...NeoDaycareTemplate.navigation.routes,
          { ...NeoDaycareTemplate.navigation.routes[0] }
        ]
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "ux.navigation" && i.message.includes("Duplicate route"))).toBe(true);
  });

  test("rejects route referencing missing screen", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      navigation: {
        ...NeoDaycareTemplate.navigation,
        routes: [
          {
            ...NeoDaycareTemplate.navigation.routes[0],
            screenId: "nonexistent_screen"
          }
        ]
      }
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "ux.navigation" && i.message.includes("missing screenId"))).toBe(true);
  });
});

describe("Premium Quality Gate - Design Limits", () => {
  test("rejects too many screens", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      screens: Array(13).fill(null).map((_, i) => ({
        ...NeoDaycareTemplate.screens[0],
        id: `screen_${i}`
      }))
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "design.tooManyScreens")).toBe(true);
  });

  test("rejects screen with too many components", () => {
    const blueprint = {
      ...NeoDaycareTemplate,
      screens: [
        {
          ...NeoDaycareTemplate.screens[0],
          components: Array(81).fill(null).map((_, i) => ({
            id: `text_${i}`,
            type: "Text" as const,
            props: { text: `Text ${i}` }
          }))
        }
      ]
    };
    const parsed = AppBlueprintSchema.parse(blueprint);
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "design.tooManyComponentsInScreen")).toBe(true);
  });
});

describe("Premium Quality Gate - Components", () => {
  test("rejects unknown component type", () => {
    // Create a valid blueprint first, then manually inject an invalid component
    // to test the premium gate validation (bypassing schema validation)
    const parsed = AppBlueprintSchema.parse(NeoDaycareTemplate);
    
    // Manually add an invalid component type to test premium gate
    const invalidComponent = {
      id: "invalid_component",
      type: "InvalidComponent",
      props: {}
    } as any;
    
    parsed.screens[0].components.push(invalidComponent);
    
    const result = validatePremiumQuality(parsed);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "components.unknownType")).toBe(true);
  });
});






