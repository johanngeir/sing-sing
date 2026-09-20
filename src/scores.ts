import { z } from "zod";
import { ScoreSchema } from "./schemas.ts";
import type { Score } from "./types.ts";

export const SCORES: Score[] = z.array(ScoreSchema).parse([
  { name: "Drottinn gerðu hljótt", url: "/scores/drottinn-gerdu-hljott.musicxml", voices: "SATB" },
  { name: "Færðu mér ljósið", url: "/scores/faerdu-mer-ljosid.musicxml", voices: "SATBB" },
  { name: "Fjallið Skjaldbreiður", url: "/scores/fjallid-skjaldbreidur.musicxml", voices: "TTBB" },
  { name: "Nú máttu hægt", url: "/scores/nu-mattu-haegt.musicxml", voices: "TTBB" },
  { name: "Samferða", url: "/scores/samferda.musicxml", voices: "TTBB" },
  { name: "Skye boat song", url: "/scores/skye-boat-song.musicxml", voices: "TTBB" },
  { name: "Verndarvængur", url: "/scores/verndarvaengur.musicxml", voices: "TTBB" },
]);
