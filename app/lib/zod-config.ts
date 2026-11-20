import { z } from "zod";

// Zod probes for eval support with new Function. A strict CSP reports that probe, even though zod catches the error.
// Turning the compiled mode off skips the probe. It costs nothing at this size (audit H1).
// Every file that builds a schema imports this first, so the setting is in place before the first schema exists.
z.config({ jitless: true });
