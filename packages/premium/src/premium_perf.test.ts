import { describe, expect, test } from "vitest";
import { estimateComponentCost, estimateBlueprintRenderCost } from "./premium_perf.js";
import type { ComponentNode, AppBlueprint } from "@neo/contracts";
import { NeoDaycareTemplate } from "./templates/neo_daycare.js";

describe("Performance Estimation", () => {
  describe("estimateComponentCost", () => {
    test("calculates cost for Text component", () => {
      const text: ComponentNode = {
        id: "text_1",
        type: "Text",
        props: { text: "Hello" }
      };
      expect(estimateComponentCost(text)).toBe(1);
    });

    test("calculates cost for Button component", () => {
      const button: ComponentNode = {
        id: "btn_1",
        type: "Button",
        props: {
          label: "Click",
          onPress: { action: "noop" }
        }
      };
      expect(estimateComponentCost(button)).toBe(5);
    });

    test("calculates cost for Card component", () => {
      const card: ComponentNode = {
        id: "card_1",
        type: "Card",
        props: {
          title: "Card",
          children: []
        }
      };
      expect(estimateComponentCost(card)).toBe(3);
    });

    test("calculates cost for Card with children", () => {
      const card: ComponentNode = {
        id: "card_1",
        type: "Card",
        props: {
          title: "Card",
          children: [
            {
              id: "text_1",
              type: "Text",
              props: { text: "Child 1" }
            },
            {
              id: "text_2",
              type: "Text",
              props: { text: "Child 2" }
            }
          ]
        }
      };
      // Card base cost (3) + 2 Text components (1 each) = 5
      expect(estimateComponentCost(card)).toBe(5);
    });

    test("calculates cost for List component", () => {
      const list: ComponentNode = {
        id: "list_1",
        type: "List",
        props: {
          title: "List",
          itemTitleField: "name",
          onItemPress: { action: "noop" }
        }
      };
      expect(estimateComponentCost(list)).toBe(25);
    });

    test("calculates cost for Form component", () => {
      const form: ComponentNode = {
        id: "form_1",
        type: "Form",
        props: {
          modelId: "user",
          fields: []
        }
      };
      expect(estimateComponentCost(form)).toBe(30);
    });

    test("returns default cost for unknown component type", () => {
      const unknown = {
        id: "unknown_1",
        type: "Unknown" as any,
        props: {}
      };
      expect(estimateComponentCost(unknown as ComponentNode)).toBe(50);
    });
  });

  describe("estimateBlueprintRenderCost", () => {
    test("calculates cost for simple blueprint", () => {
      const blueprint: AppBlueprint = {
        schemaVersion: "0.1",
        appId: "test",
        name: "Test",
        archetype: { domain: "test" },
        theme: {
          tokens: {
            paletteId: "neo_palette",
            tokenSetId: "neo_tokens",
            density: "normal",
            radius: "soft",
            shadow: "subtle",
            typography: { fontFamilyId: "neo_sans", scale: "md" },
            colors: {
              background: "#FFFFFF",
              surface: "#F0F0F0",
              text: "#000000",
              mutedText: "#666666",
              primary: "#0066CC",
              primaryText: "#FFFFFF",
              danger: "#CC0000",
              dangerText: "#FFFFFF"
            }
          }
        },
        navigation: {
          type: "tabs",
          routes: [
            {
              id: "home",
              label: "Home",
              iconId: "neo_home",
              screenId: "screen_1"
            }
          ]
        },
        screens: [
          {
            id: "screen_1",
            title: "Screen 1",
            kind: "dashboard",
            states: { loading: { title: "Loading..." }, error: { title: "Error" } },
            components: [
              {
                id: "text_1",
                type: "Text",
                props: { text: "Hello" }
              }
            ]
          }
        ]
      };
      // Base screen cost (50) + Text component (1) = 51
      expect(estimateBlueprintRenderCost(blueprint)).toBe(51);
    });

    test("calculates cost for daycare template", () => {
      const cost = estimateBlueprintRenderCost(NeoDaycareTemplate);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1500); // Should be under the limit
    });

    test("includes base screen overhead for each screen", () => {
      const blueprint: AppBlueprint = {
        schemaVersion: "0.1",
        appId: "test",
        name: "Test",
        archetype: { domain: "test" },
        theme: {
          tokens: {
            paletteId: "neo_palette",
            tokenSetId: "neo_tokens",
            density: "normal",
            radius: "soft",
            shadow: "subtle",
            typography: { fontFamilyId: "neo_sans", scale: "md" },
            colors: {
              background: "#FFFFFF",
              surface: "#F0F0F0",
              text: "#000000",
              mutedText: "#666666",
              primary: "#0066CC",
              primaryText: "#FFFFFF",
              danger: "#CC0000",
              dangerText: "#FFFFFF"
            }
          }
        },
        navigation: {
          type: "tabs",
          routes: [
            {
              id: "home",
              label: "Home",
              iconId: "neo_home",
              screenId: "screen_1"
            }
          ]
        },
        screens: [
          {
            id: "screen_1",
            title: "Screen 1",
            kind: "dashboard",
            states: { loading: { title: "Loading..." }, error: { title: "Error" } },
            components: []
          },
          {
            id: "screen_2",
            title: "Screen 2",
            kind: "dashboard",
            states: { loading: { title: "Loading..." }, error: { title: "Error" } },
            components: []
          }
        ]
      };
      // 2 screens * 50 base cost = 100
      expect(estimateBlueprintRenderCost(blueprint)).toBe(100);
    });
  });
});
