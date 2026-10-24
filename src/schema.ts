// SPDX-License-Identifier: MIT
// Frozen Section JSON contract used by the public MCP tools.
import { z } from "zod";

/** Stored shape of one section spec. Generation output must fit this. */
export const sectionSpecSchema = z.object({
  copy: z
    .object({
      headline: z.string().optional(),
      subheadline: z.string().optional(),
      body: z.string().optional(),
      cta: z.string().optional(),
      lineUrl: z.string().optional(),
    })
    .default({}),
  layout: z.record(z.unknown()).optional(),
  assets: z
    .array(
      z.object({
        role: z.string(),
        assetId: z.string().optional(),
        url: z.string().optional(),
        posterUrl: z.string().optional(),
      }),
    )
    .optional(),
  tone: z.string().optional(),
  constraints: z.record(z.unknown()).optional(),
  rationale: z.string().optional(),
});

export const generationBriefSchema = z.object({
  industry: z.string().optional(),
  channel: z.string().optional(),
  funnelGoal: z.string().optional(),
  direction: z.string().optional(),
  strategyText: z.string().optional(),
  goal: z.string().optional(),
  notes: z.string().optional(),
  strategyBrief: z.record(z.unknown()).optional(),
});

export const structureSlotSchema = z.object({
  type: z.string().min(1),
  displayTitle: z.string().min(1).max(200).optional(),
  job: z.string().optional(),
  variant: z.string().min(1).optional(),
});

/** Recipe / structure constraints. Models must not replace this with a full-page HTML blob. */
export const structureConstraintSchema = z.object({
  recipeId: z.string().optional(),
  directionId: z.string().optional(),
  sectionTypes: z.array(z.string().min(1)).optional(),
  structure: z.array(structureSlotSchema).optional(),
  minSections: z.number().int().min(1).max(24).optional(),
  maxSections: z.number().int().min(1).max(24).optional(),
  lockedSectionIds: z.array(z.string()).optional(),
  geneCatalogId: z.string().optional(),
});

export const trendSummarySchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  asOf: z.string().optional(),
  source: z.string().optional(),
});

export const generateLpSectionsInputSchema = z.object({
  brief: generationBriefSchema,
  constraints: structureConstraintSchema.optional(),
  trendSummary: trendSummarySchema.optional(),
  /** Compressed coach context. Empty when none is supplied by the caller. */
  coachContext: z.string().optional(),
});

export const generatedSectionSchema = z.object({
  orderIndex: z.number().int().min(0),
  type: z.string().min(1),
  variant: z.string().min(1).default("default"),
  displayTitle: z.string().min(1).max(200),
  job: z.string().default(""),
  spec: sectionSpecSchema,
  rationale: z.string().optional(),
});

export const mcpGenerateLpSectionsResultSchema = z.object({
  recipeId: z.string().min(1),
  sections: z.array(generatedSectionSchema).min(1),
});

export const lpTemplateSummarySchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  hint: z.string(),
  industry: z.string(),
  channel: z.string(),
  funnelGoal: z.string(),
});

export const listTemplatesOutputSchema = z.object({
  templates: z.array(lpTemplateSummarySchema).min(1),
});

export const getRecipeInputSchema = z.object({
  recipeId: z.string().min(1),
});

export const recipeSectionSchema = z.object({
  orderIndex: z.number().int().min(0),
  type: z.string().min(1),
  displayTitle: z.string().min(1),
  job: z.string(),
});

export const getRecipeOutputSchema = z.object({
  recipeId: z.string().min(1),
  requestedId: z.string().min(1),
  label: z.string(),
  sections: z.array(recipeSectionSchema).min(1),
});

export const MCP_SECTION_TOOLS = [
  {
    name: "list_templates",
    description: "List LP direction recipes the canvas can generate from. No model call.",
  },
  {
    name: "get_recipe",
    description: "Return ordered section structure for a recipe id (type, title, job). No copy, no HTML.",
  },
  {
    name: "generate_lp_sections",
    description:
      "Generate an ordered Section array (type, spec, rationale) from a brief and structure constraints. Never return a full-page HTML document.",
  },
] as const;

export type StructureSlot = z.infer<typeof structureSlotSchema>;
export type GenerationBrief = z.infer<typeof generationBriefSchema>;
export type StructureConstraint = z.infer<typeof structureConstraintSchema>;
export type TrendSummary = z.infer<typeof trendSummarySchema>;
export type GenerateLpSectionsInput = z.infer<typeof generateLpSectionsInputSchema>;
export type GeneratedSection = z.infer<typeof generatedSectionSchema>;
export type McpSectionToolName = (typeof MCP_SECTION_TOOLS)[number]["name"];
export type ListTemplatesOutput = z.infer<typeof listTemplatesOutputSchema>;
export type GetRecipeOutput = z.infer<typeof getRecipeOutputSchema>;
