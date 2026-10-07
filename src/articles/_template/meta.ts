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
  title: "H1 · FONT-FAMILY: METAMORPHOUS · SIZE: CLAMP(28PX, 6.5VW, 46PX) · WEIGHT: 700 · COLOR: #F3ECDF",
  description: "LEAD / P · FONT-FAMILY: HELVETICA NEUE ROMAN · SIZE: CLAMP(19PX, 2.5VW, 22PX) · WEIGHT: 400 (ITALIC) · LINE-HEIGHT: 1.6 · COLOR: #CDC3B6",
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
