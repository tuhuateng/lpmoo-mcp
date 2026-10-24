// SPDX-License-Identifier: MIT
// Vendored offline stub for the public MCP interface. No private SaaS assets.
import {
  generateLpSectionsInputSchema,
  getRecipeInputSchema,
  getRecipeOutputSchema,
  listTemplatesOutputSchema,
  mcpGenerateLpSectionsResultSchema,
  MCP_SECTION_TOOLS,
  type GenerateLpSectionsInput,
  type GetRecipeOutput,
  type ListTemplatesOutput,
  type McpSectionToolName,
  type StructureSlot,
} from "./schema.js";

/** Direction ids returned by list_templates. Labels only; no campaign prompts. */
const LP_DIRECTIONS = [
  { id: "ecommerce", label: "EC・D2C", hint: "商品販売・カート CV", industry: "ecommerce", channel: "meta", funnelGoal: "purchase" },
  { id: "shopify_single", label: "Shopify 1ページ", hint: "単一 SKU・限定オファー", industry: "ecommerce", channel: "meta", funnelGoal: "purchase" },
  { id: "game", label: "ゲーム", hint: "インストール・事前登録", industry: "game", channel: "meta", funnelGoal: "install" },
  { id: "beauty_salon", label: "美容・サロン", hint: "来店予約・体験", industry: "beauty", channel: "instagram", funnelGoal: "reservation" },
  { id: "offline_store", label: "店舗・来店", hint: "実店舗・地域集客", industry: "retail", channel: "google", funnelGoal: "visit" },
  { id: "line_cp", label: "LINE 公式 CP", hint: "友だち追加・特典", industry: "general", channel: "line", funnelGoal: "line" },
  { id: "lead_gen", label: "リード獲得", hint: "相談・問い合わせ", industry: "general", channel: "meta", funnelGoal: "lead" },
  { id: "saas", label: "SaaS", hint: "資料請求・デモ", industry: "saas", channel: "google", funnelGoal: "demo" },
] as const;

type CopyFields = {
  headline: string;
  subheadline?: string;
  body?: string;
  cta?: string;
  lineUrl?: string;
};

type RecipeSection = {
  type: string;
  displayTitle: string;
  job: string;
};

const COPY_BY_TYPE: Record<string, CopyFields> = {
  hero: {
    headline: "最初の画面で、約束を一つ置く。",
    subheadline: "スクロール前に誰向けかを言い切る。",
    cta: "詳しく見る",
  },
  empathy: {
    headline: "こんな状態で止まっていませんか。",
    body: "読者がすでに感じている摩擦を、先に言語化する。",
  },
  proof: {
    headline: "選ばれている理由",
    body: "数字・事例・第三者の声で、約束を裏づける。",
  },
  benefit: {
    headline: "続ける理由が、三点で分かる。",
    body: "比較しなくていいように、違いを短く並べる。",
  },
  mechanism: {
    headline: "中身が分かる。",
    body: "成分・機能・手順など、買う前に必要な事実だけ。",
  },
  offer: {
    headline: "今の条件を、隠さない。",
    body: "価格・特典・期限を同じ画面に置く。",
    cta: "LINEで相談する",
    lineUrl: "https://lin.ee/example",
  },
  legal: {
    headline: "注意事項",
    body: "景表法・解約・個人情報の要点。",
  },
};

const HEADLINE_BY_RECIPE: Record<string, string> = {
  "beauty_salon:hero": "初回体験で、肌の調子を整える。",
  "ecommerce:hero": "今日から届く、定番の一品。",
  "shopify_single:hero": "この1点だけで、カートまで進める。",
  "game:hero": "リリース前に、席を確保する。",
  "offline_store:hero": "近くの店舗で、今日試せる。",
  "line_cp:hero": "友だち追加で、特典を受け取る。",
  "lead_gen:hero": "相談の前に、状況が揃う。",
  "saas:hero": "デモの前に、課題が一言で伝わる。",
};

const RECIPES: Record<string, RecipeSection[]> = {
  ecommerce: [
    { type: "hero", displayTitle: "Hero", job: "商品 promise・フック" },
    { type: "benefit", displayTitle: "ベネフィット", job: "3つの強み" },
    { type: "mechanism", displayTitle: "商品詳細", job: "SKU・成分・比較" },
    { type: "offer", displayTitle: "Offer", job: "価格・特典・CTA" },
  ],
  shopify_single: [
    { type: "hero", displayTitle: "Hero", job: "単一 SKU の約束" },
    { type: "benefit", displayTitle: "ベネフィット", job: "この1点で足りる理由" },
    { type: "proof", displayTitle: "レビュー", job: "購入者の声" },
    { type: "offer", displayTitle: "Offer", job: "限定価格と CTA" },
  ],
  game: [
    { type: "hero", displayTitle: "Hero", job: "世界観と登録動機" },
    { type: "benefit", displayTitle: "遊び方", job: "三分で分かる体験" },
    { type: "proof", displayTitle: "実績", job: "メディア・事前登録数" },
    { type: "offer", displayTitle: "事前登録", job: "特典と CTA" },
  ],
  beauty_salon: [
    { type: "hero", displayTitle: "Hero", job: "第一印象で期待値" },
    { type: "empathy", displayTitle: "悩み共感", job: "悩みの共感" },
    { type: "proof", displayTitle: "実績", job: "信頼・実績" },
    { type: "offer", displayTitle: "Offer", job: "来店予約" },
  ],
  offline_store: [
    { type: "hero", displayTitle: "Hero", job: "来店理由" },
    { type: "empathy", displayTitle: "状況", job: "今の不便" },
    { type: "proof", displayTitle: "店舗", job: "アクセスと実績" },
    { type: "offer", displayTitle: "来店", job: "予約・クーポン" },
  ],
  line_cp: [
    { type: "hero", displayTitle: "Hero", job: "特典を一言で" },
    { type: "benefit", displayTitle: "特典内容", job: "何が届くか" },
    { type: "mechanism", displayTitle: "受け取り方", job: "友だち追加の手順" },
    { type: "offer", displayTitle: "CTA", job: "LINE 追加" },
  ],
  lead_gen: [
    { type: "hero", displayTitle: "Hero", job: "相談で得られること" },
    { type: "empathy", displayTitle: "課題", job: "放置コスト" },
    { type: "proof", displayTitle: "事例", job: "近い業種の結果" },
    { type: "offer", displayTitle: "相談", job: "フォームまたは LINE" },
  ],
  saas: [
    { type: "hero", displayTitle: "Hero", job: "誰のどの作業が短くなるか" },
    { type: "empathy", displayTitle: "現状", job: "今の手作業" },
    { type: "mechanism", displayTitle: "仕組み", job: "導入後の流れ" },
    { type: "offer", displayTitle: "デモ", job: "資料請求・デモ CTA" },
  ],
};

const INDUSTRY_RECIPE: Record<string, string> = {
  beauty: "beauty_salon",
  ecommerce: "ecommerce",
  retail: "offline_store",
  game: "game",
  saas: "saas",
  fitness: "lead_gen",
  general: "lead_gen",
};

export class McpStubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpStubError";
  }
}

export function listSectionTemplates() {
  return listTemplatesOutputSchema.parse({
    templates: LP_DIRECTIONS.map((direction) => ({
      id: direction.id,
      label: direction.label,
      hint: direction.hint,
      industry: direction.industry,
      channel: direction.channel,
      funnelGoal: direction.funnelGoal,
    })),
  });
}

export function resolveRecipeId(input: GenerateLpSectionsInput) {
  const candidates = [
    input.constraints?.recipeId,
    input.constraints?.directionId,
    input.brief.direction,
    input.brief.industry ? INDUSTRY_RECIPE[input.brief.industry] : undefined,
    input.brief.industry,
  ];
  for (const id of candidates) {
    if (id && RECIPES[id]) return id;
  }
  return "lead_gen";
}

function recipeLabel(recipeId: string) {
  return LP_DIRECTIONS.find((direction) => direction.id === recipeId)?.label ?? recipeId;
}

export function getSectionRecipe(recipeId: string) {
  const resolved = RECIPES[recipeId] ? recipeId : "lead_gen";
  return getRecipeOutputSchema.parse({
    recipeId: resolved,
    requestedId: recipeId,
    label: recipeLabel(resolved),
    sections: RECIPES[resolved].map((section, orderIndex) => ({
      orderIndex,
      type: section.type,
      displayTitle: section.displayTitle,
      job: section.job,
    })),
  });
}

function slotsFromInput(input: GenerateLpSectionsInput, recipeId: string): StructureSlot[] {
  const structure = input.constraints?.structure?.filter((slot) => slot.type) ?? [];
  if (structure.length) return structure;
  const types = input.constraints?.sectionTypes?.filter(Boolean) ?? [];
  if (types.length) return types.map((type) => ({ type }));
  return RECIPES[recipeId].map((section) => ({
    type: section.type,
    displayTitle: section.displayTitle,
    job: section.job,
  }));
}

function clampSlots(slots: StructureSlot[], input: GenerateLpSectionsInput) {
  const max = input.constraints?.maxSections;
  if (!max || slots.length <= max) return slots;
  return slots.slice(0, max);
}

function copyFor(recipeId: string, type: string, displayTitle: string): CopyFields {
  const base = COPY_BY_TYPE[type] ?? { headline: displayTitle };
  const headline = HEADLINE_BY_RECIPE[`${recipeId}:${type}`] ?? base.headline;
  return { ...base, headline };
}

/** Local stand-in for `generate_lp_sections`. Fixed copy, validated Section JSON, no network. */
export function stubGenerateLpSections(raw: GenerateLpSectionsInput) {
  const input = generateLpSectionsInputSchema.parse(raw);
  const recipeId = resolveRecipeId(input);
  const recipe = RECIPES[recipeId];
  const slots = clampSlots(slotsFromInput(input, recipeId), input);
  const trend = input.trendSummary?.summary?.trim() || input.trendSummary?.headline?.trim();

  const sections = slots.map((slot, orderIndex) => {
    const fallback = recipe.find((section) => section.type === slot.type);
    const displayTitle = slot.displayTitle ?? fallback?.displayTitle ?? slot.type;
    const job = slot.job ?? fallback?.job ?? "";
    const rationaleParts = [`${displayTitle} は「${job || slot.type}」のためのブロック。`];
    if (orderIndex === 0 && trend) rationaleParts.push(`話題: ${trend}`);
    if (input.coachContext?.trim()) rationaleParts.push("コーチ文脈を添付");
    const rationale = rationaleParts.join(" ");
    return {
      orderIndex,
      type: slot.type,
      variant: slot.variant ?? "default",
      displayTitle,
      job,
      spec: {
        copy: copyFor(recipeId, slot.type, displayTitle),
        rationale,
      },
      rationale,
    };
  });

  return mcpGenerateLpSectionsResultSchema.parse({ recipeId, sections });
}

export function dispatchMcpStub(name: "list_templates", args?: unknown): ListTemplatesOutput;
export function dispatchMcpStub(name: "get_recipe", args: unknown): GetRecipeOutput;
export function dispatchMcpStub(
  name: "generate_lp_sections",
  args: unknown,
): ReturnType<typeof stubGenerateLpSections>;
export function dispatchMcpStub(name: string, args?: unknown): unknown;
export function dispatchMcpStub(name: string, args: unknown = {}) {
  switch (name as McpSectionToolName) {
    case "list_templates":
      return listSectionTemplates();
    case "get_recipe": {
      const input = getRecipeInputSchema.parse(args);
      return getSectionRecipe(input.recipeId);
    }
    case "generate_lp_sections":
      return stubGenerateLpSections(generateLpSectionsInputSchema.parse(args));
    default:
      throw new McpStubError(`unknown_mcp_tool:${name}`);
  }
}

export { MCP_SECTION_TOOLS };
