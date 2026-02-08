import { describe, it, expect } from "vitest";
import {
  ScoreSchema,
  InstrumentKeySchema,
  VoiceInstrumentsSchema,
  ThemeSchema,
  BoolStringSchema,
  safeParse
} from "../schemas.ts";

describe("ScoreSchema", () => {
  it("accepts valid score", () => {
    const result = ScoreSchema.safeParse({
      name: "Test Score",
      url: "/scores/test.musicxml",
      voices: "SATB"
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = ScoreSchema.safeParse({
      url: "/scores/test.musicxml",
      voices: "SATB"
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = ScoreSchema.safeParse({
      name: "",
      url: "/scores/test.musicxml",
      voices: "SATB"
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing url", () => {
    const result = ScoreSchema.safeParse({
      name: "Test",
      voices: "SATB"
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing voices", () => {
    const result = ScoreSchema.safeParse({
      name: "Test",
      url: "/test.musicxml"
    });
    expect(result.success).toBe(false);
  });

  it("strips extra properties", () => {
    const result = ScoreSchema.safeParse({
      name: "Test",
      url: "/test.musicxml",
      voices: "SATB",
      extra: "ignored"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("extra");
    }
  });
});

describe("InstrumentKeySchema", () => {
  it.each(["piano", "violin", "cello", "organ", "saxophone"] as const)(
    "accepts '%s'",
    (key) => {
      expect(InstrumentKeySchema.safeParse(key).success).toBe(true);
    }
  );

  it("rejects invalid instrument", () => {
    expect(InstrumentKeySchema.safeParse("guitar").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(InstrumentKeySchema.safeParse("").success).toBe(false);
  });
});

describe("VoiceInstrumentsSchema", () => {
  it("accepts valid record", () => {
    const result = VoiceInstrumentsSchema.safeParse({
      S: "piano",
      A: "violin",
      T: "cello",
      B: "organ"
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty record", () => {
    expect(VoiceInstrumentsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid instrument value", () => {
    const result = VoiceInstrumentsSchema.safeParse({
      S: "guitar"
    });
    expect(result.success).toBe(false);
  });
});

describe("ThemeSchema", () => {
  it("accepts 'light'", () => {
    expect(ThemeSchema.safeParse("light").success).toBe(true);
  });

  it("accepts 'dark'", () => {
    expect(ThemeSchema.safeParse("dark").success).toBe(true);
  });

  it("rejects other strings", () => {
    expect(ThemeSchema.safeParse("blue").success).toBe(false);
  });
});

describe("BoolStringSchema", () => {
  it("transforms 'true' to true", () => {
    const result = BoolStringSchema.safeParse("true");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(true);
  });

  it("transforms 'false' to false", () => {
    const result = BoolStringSchema.safeParse("false");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(false);
  });

  it("transforms any other string to false", () => {
    const result = BoolStringSchema.safeParse("maybe");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(BoolStringSchema.safeParse(true).success).toBe(false);
    expect(BoolStringSchema.safeParse(42).success).toBe(false);
  });
});

describe("safeParse", () => {
  it("returns parsed value on success", () => {
    expect(safeParse(ThemeSchema, "dark", "light")).toBe("dark");
  });

  it("returns fallback on failure", () => {
    expect(safeParse(ThemeSchema, "blue", "light")).toBe("light");
  });

  it("returns fallback for null input", () => {
    expect(safeParse(ThemeSchema, null, "dark")).toBe("dark");
  });

  it("returns fallback for undefined input", () => {
    expect(safeParse(ThemeSchema, undefined, "light")).toBe("light");
  });
});
