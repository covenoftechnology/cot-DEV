import type { ArticleMeta } from '../../types/article';

/**
 * ============================================================
 * METADATA DEL ARTÍCULO (TEMPLATE DE REFERENCIA)
 * ============================================================
 * 
 * Configuración editorial del artículo.
 * Cuando copies esta plantilla para un nuevo artículo, edita estos campos.
 * Mantén `status: "draft"` hasta que tu contenido esté listo para publicarse.
 */
const meta: ArticleMeta = {
  title: "The Magic Science in SFMC's Einstein AI",
  description: "An esoteric masterclass on predictive engagement scoring, send time optimization, frequency fatigue wards, and AI-driven journey orchestration.",
  author: "Oracle of Orgs",

  category: "Architecture",

  tags: [
    "Einstein AI",
    "SFMC",
    "Data Science",
    "Architecture"
  ],

  rank: "Warden",
  readingTime: "18 min",
  aetherReward: 180,
  publishedDate: "2026-10-05",
  meta: "18 min · ✦ 180 Aether",

  // 'draft' por defecto en el template para no publicarse accidentalmente
  status: "draft",
  featured: false,
  order: 2,
  wide: true,

  thumbBg: "repeating-linear-gradient(135deg,rgba(139,92,196,.12) 0 10px,rgba(139,92,196,.03) 10px 20px)",
};

export default meta;
