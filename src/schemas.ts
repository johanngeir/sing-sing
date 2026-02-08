import { z } from "zod";

// ── Score catalog schema ─────────────────────────────────────────────

export const ScoreSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  voices: z.string().min(1)
});

export type Score = z.infer<typeof ScoreSchema>;

// ── Instrument key schema ────────────────────────────────────────────

export const InstrumentKeySchema = z.enum([
  "piano",
  "violin",
  "cello",
  "organ",
  "saxophone"
]);

export type InstrumentKey = z.infer<typeof InstrumentKeySchema>;

// ── Voice instruments (localStorage JSON) ────────────────────────────

export const VoiceInstrumentsSchema = z.record(z.string(), InstrumentKeySchema);

export type VoiceInstruments = z.infer<typeof VoiceInstrumentsSchema>;

// ── localStorage field schemas (used in createState) ─────────────────

export const ThemeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const BoolStringSchema = z
  .string()
  .transform((val) => val === "true");

// ── Safe parse helpers ───────────────────────────────────────────────

export function safeParse<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}
