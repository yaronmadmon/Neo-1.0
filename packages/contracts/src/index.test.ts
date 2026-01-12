import { describe, expect, test } from "vitest";
import {
  AppBlueprintSchema,
  IdSchema,
  ColorHexSchema,
  ThemeTokensSchema,
  ButtonComponentSchema,
  TextComponentSchema,
  CardComponentSchema,
  ListComponentSchema,
  FormComponentSchema,
  ScreenSchema,
  NavigationSchema
} from "./index.js";

describe("Contracts - ID Schema", () => {
  test("accepts valid IDs", () => {
    expect(IdSchema.parse("valid_id")).toBe("valid_id");
    expect(IdSchema.parse("valid-id")).toBe("valid-id");
    expect(IdSchema.parse("valid_123")).toBe("valid_123");
    expect(IdSchema.parse("VALID_ID")).toBe("VALID_ID");
  });

  test("rejects invalid IDs", () => {
    expect(() => IdSchema.parse("")).toThrow();
    expect(() => IdSchema.parse("invalid id")).toThrow(); // space
    expect(() => IdSchema.parse("invalid.id")).toThrow(); // dot
    expect(() => IdSchema.parse("invalid@id")).toThrow(); // @
  });
});

describe("Contracts - Color Hex Schema", () => {
  test("accepts valid hex colors", () => {
    expect(ColorHexSchema.parse("#FFFFFF")).toBe("#FFFFFF");
    expect(ColorHexSchema.parse("#000000")).toBe("#000000");
    expect(ColorHexSchema.parse("#FF0000")).toBe("#FF0000");
    expect(ColorHexSchema.parse("#FFFFFF00")).toBe("#FFFFFF00"); // with alpha
  });

  test("rejects invalid hex colors", () => {
    expect(() => ColorHexSchema.parse("FFFFFF")).toThrow(); // missing #
    expect(() => ColorHexSchema.parse("#FFF")).toThrow(); // short form
    expect(() => ColorHexSchema.parse("#GGGGGG")).toThrow(); // invalid hex
    expect(() => ColorHexSchema.parse("red")).toThrow(); // named color
  });
});

describe("Contracts - Theme Tokens Schema", () => {
  test("accepts valid theme tokens", () => {
    const valid = {
      paletteId: "neo_palette",
      tokenSetId: "neo_tokens",
      density: "normal" as const,
      radius: "soft" as const,
      shadow: "subtle" as const,
      typography: {
        fontFamilyId: "neo_sans",
        scale: "md" as const
      },
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
    };
    expect(ThemeTokensSchema.parse(valid)).toEqual(valid);
  });

  test("rejects invalid density", () => {
    const invalid = {
      paletteId: "neo_palette",
      tokenSetId: "neo_tokens",
      density: "invalid",
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
    };
    expect(() => ThemeTokensSchema.parse(invalid)).toThrow();
  });
});

describe("Contracts - Component Schemas", () => {
  test("ButtonComponentSchema accepts valid button", () => {
    const button = {
      id: "btn_1",
      type: "Button" as const,
      props: {
        label: "Click me",
        variant: "primary" as const,
        size: "md" as const,
        onPress: {
          action: "navigate" as const,
          target: "screen_1"
        }
      }
    };
    expect(ButtonComponentSchema.parse(button)).toEqual(button);
  });

  test("TextComponentSchema accepts valid text", () => {
    const text = {
      id: "text_1",
      type: "Text" as const,
      props: {
        text: "Hello world",
        tone: "default" as const,
        size: "md" as const
      }
    };
    expect(TextComponentSchema.parse(text)).toEqual(text);
  });

  test("CardComponentSchema accepts valid card", () => {
    const card = {
      id: "card_1",
      type: "Card" as const,
      props: {
        title: "Card Title",
        children: [
          {
            id: "text_1",
            type: "Text" as const,
            props: { text: "Card content", tone: "default" as const, size: "md" as const }
          }
        ]
      }
    };
    const parsed = CardComponentSchema.parse(card);
    expect(parsed.id).toBe("card_1");
    expect(parsed.type).toBe("Card");
    expect(parsed.props.title).toBe("Card Title");
    expect(parsed.props.children[0].props.text).toBe("Card content");
    // Defaults are applied
    expect(parsed.props.children[0].props.tone).toBe("default");
    expect(parsed.props.children[0].props.size).toBe("md");
  });

  test("ListComponentSchema accepts valid list", () => {
    const list = {
      id: "list_1",
      type: "List" as const,
      props: {
        title: "My List",
        itemTitleField: "name",
        onItemPress: {
          action: "navigate" as const,
          target: "detail"
        }
      }
    };
    expect(ListComponentSchema.parse(list)).toEqual(list);
  });

  test("FormComponentSchema accepts valid form", () => {
    const form = {
      id: "form_1",
      type: "Form" as const,
      props: {
        modelId: "user",
        fields: [
          {
            id: "name",
            label: "Name",
            kind: "text" as const,
            required: true
          },
          {
            id: "email",
            label: "Email",
            kind: "email" as const,
            required: true
          }
        ]
      }
    };
    expect(FormComponentSchema.parse(form)).toEqual(form);
  });
});

describe("Contracts - Screen Schema", () => {
  test("accepts valid screen", () => {
    const screen = {
      id: "screen_1",
      title: "My Screen",
      kind: "dashboard" as const,
      states: {
        loading: { title: "Loading..." },
        empty: {
          title: "No data",
          body: "Add some data",
          primaryActionLabel: "Add"
        },
        error: {
          title: "Error",
          body: "Something went wrong"
        }
      },
      components: []
    };
    expect(ScreenSchema.parse(screen)).toEqual(screen);
  });

  test("accepts screen with minimal states", () => {
    const screen = {
      id: "screen_1",
      title: "My Screen",
      kind: "list" as const,
      states: {
        loading: { title: "Loading..." },
        error: { title: "Error" }
      },
      components: []
    };
    const parsed = ScreenSchema.parse(screen);
    expect(parsed.id).toBe("screen_1");
    expect(parsed.title).toBe("My Screen");
    expect(parsed.kind).toBe("list");
    expect(parsed.states.loading.title).toBe("Loading...");
    expect(parsed.states.error.title).toBe("Error");
  });
});

describe("Contracts - Navigation Schema", () => {
  test("accepts valid navigation", () => {
    const nav = {
      type: "tabs" as const,
      routes: [
        {
          id: "home",
          label: "Home",
          iconId: "neo_home",
          screenId: "dashboard"
        },
        {
          id: "list",
          label: "List",
          iconId: "neo_list",
          screenId: "list_screen"
        }
      ]
    };
    expect(NavigationSchema.parse(nav)).toEqual(nav);
  });

  test("rejects empty routes", () => {
    const nav = {
      type: "tabs" as const,
      routes: []
    };
    expect(() => NavigationSchema.parse(nav)).toThrow();
  });
});

describe("Contracts - App Blueprint Schema", () => {
  test("accepts minimal valid blueprint", () => {
    const blueprint = {
      schemaVersion: "0.1" as const,
      appId: "test_app",
      name: "Test App",
      archetype: {
        domain: "test",
        subdomain: "test_sub",
        audience: "business" as const,
        tone: "neutral" as const
      },
      theme: {
        tokens: {
          paletteId: "neo_palette",
          tokenSetId: "neo_tokens",
          density: "normal" as const,
          radius: "soft" as const,
          shadow: "subtle" as const,
          typography: {
            fontFamilyId: "neo_sans",
            scale: "md" as const
          },
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
        type: "tabs" as const,
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
          kind: "dashboard" as const,
          states: {
            loading: { title: "Loading..." },
            error: { title: "Error" }
          },
          components: []
        }
      ]
    };
    expect(AppBlueprintSchema.parse(blueprint)).toEqual(blueprint);
  });

  test("rejects blueprint without screens", () => {
    const blueprint = {
      schemaVersion: "0.1" as const,
      appId: "test_app",
      name: "Test App",
      archetype: { domain: "test" },
      theme: {
        tokens: {
          paletteId: "neo_palette",
          tokenSetId: "neo_tokens",
          density: "normal" as const,
          radius: "soft" as const,
          shadow: "subtle" as const,
          typography: { fontFamilyId: "neo_sans", scale: "md" as const },
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
        type: "tabs" as const,
        routes: [
          {
            id: "home",
            label: "Home",
            iconId: "neo_home",
            screenId: "screen_1"
          }
        ]
      },
      screens: []
    };
    expect(() => AppBlueprintSchema.parse(blueprint)).toThrow();
  });
});
