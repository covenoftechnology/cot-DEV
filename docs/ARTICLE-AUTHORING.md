# ☽ Guía de Creación de Artículos — Coven of Technology

Esta guía documenta la arquitectura de artículos autocontenidos de **Coven of Technology** (`cot-DEV`).

Cada artículo funciona como un módulo independiente y autocontenido con su propio código Astro/HTML, estilos CSS aislados, imágenes locales y configuración de metadata.

---

## 1. Estructura de un Artículo

Todos los artículos viven dentro de `src/articles/`:

```text
src/articles/
│
├── _template/                      <-- Plantilla base (ignorado por el descubridor)
│   ├── index.astro                 <-- Estructura visual y contenido (HTML/Astro libre)
│   ├── article.css                 <-- CSS exclusivo del artículo
│   ├── meta.ts                     <-- Metadata editorial y estado de publicación
│   └── images/                     <-- Imágenes exclusivas del artículo
│       └── .gitkeep
│
├── apex-triggers-without-tears/    <-- Artículo real
│   ├── index.astro
│   ├── article.css
│   ├── meta.ts
│   └── images/
│
└── tu-nuevo-articulo/              <-- Nuevo artículo creado por ti
    ├── index.astro
    ├── article.css
    ├── meta.ts
    ├── images/
    └── components/                 <-- (Opcional) Componentes exclusivos
```

---

## 2. Flujo de Creación de un Nuevo Artículo

Crear y publicar un artículo no requiere tocar ningún archivo global (ni Home, ni Library, ni routers, ni arrays):

1. **Copiar la plantilla**:
   Copia la carpeta `src/articles/_template/`.
2. **Pegar y renombrar**:
   Pégala en `src/articles/` con el slug deseado en minúsculas y guiones (kebab-case):
   Ejemplo: `src/articles/einstein-discovery-insights/`.
3. **Configurar metadata**:
   Edita `meta.ts` con el título, descripción, categoría, autor, tags, etc.
4. **Escribir el contenido**:
   Edita `index.astro` escribiendo HTML/Astro con total libertad.
5. **Agregar imágenes**:
   Coloca tus imágenes en `./images/` e impórtalas directamente.
6. **Estilos locales**:
   Agrega reglas CSS específicas en `./article.css`.
7. **Probar localmente**:
   Ejecuta `npm run dev` y navega a `/article/tu-slug`.
8. **Publicar**:
   Cambia `status: "draft"` a `status: "published"` en `meta.ts`. El artículo aparecerá automáticamente en Home y Library.

---

## 3. Metadata (`meta.ts`)

Cada artículo exporta por defecto un objeto `ArticleMeta`:

```typescript
import type { ArticleMeta } from '../../types/article';

const meta: ArticleMeta = {
  title: "The Apex Incantation: Triggers Without Tears",
  description: "Bind your logic once, fire it cleanly.",
  author: "Oracle of Orgs",

  // Categoría principal para el Grimoire (Spell Book)
  category: "Apex",

  // Etiquetas para filtrado y visualización
  tags: ["Apex", "Conjuration", "Mechanic"],

  // Rango del Coven al que pertenece
  rank: "Mechanic",

  // Información visual de lectura y recompensa
  meta: "12 min · ✦ 120 Aether",

  // draft | published | hidden
  status: "published",

  // true para destacar en 'Featured scrolls' del Home
  featured: true,

  // Orden de aparición
  order: 1,

  // Fondo visual del thumbnail (opcional)
  thumbBg: "repeating-linear-gradient(135deg,rgba(216,181,107,.08) 0 10px,rgba(216,181,107,.02) 10px 20px)",
};

export default meta;
```

### Estados disponibles (`status`):
- **`published`**: El artículo se compila, genera su ruta pública `/article/[slug]` y aparece en Home y Library.
- **`draft`**: No aparece públicamente ni se genera página en producción. Es el valor por defecto de la plantilla para evitar publicaciones accidentales.
- **`hidden`**: Permanece en el código base pero no se lista en Home ni Library.

---

## 4. Libertad Total de HTML y Astro (`index.astro`)

No existe restricción a Markdown. Dentro de `index.astro` puedes estructurar cualquier diseño:

```astro
---
import ArticleLayout from '../../layouts/ArticleLayout.astro';
import './article.css';
import meta from './meta';

// Imágenes locales
import cover from './images/cover.webp';

// Componentes opcionales
import Callout from '../../components/article/Callout.astro';
---

<ArticleLayout meta={meta}>
  <!-- Puedes usar imágenes importadas -->
  <img src={cover.src} alt="Cover" class="hero-image" />

  <!-- Párrafos normales con tipografía ceremonial predeterminada -->
  <p>
    Texto introductorio...
  </p>

  <!-- Grids, flexbox, divs y secciones libres -->
  <div class="my-custom-grid">
    <div class="card">...</div>
    <div class="card">...</div>
  </div>

  <!-- Callouts opcionales -->
  <Callout type="info" title="Nota del Coven">
    Consejo importante sobre gobernadores y límites.
  </Callout>

  <!-- Código con bloques pre -->
  <pre><code>// Tu código aquí</code></pre>
</ArticleLayout>
```

> **Nota sobre sintaxis en Astro**: Si escribes llaves `{ }` literales dentro de tu HTML/plantilla (por ejemplo dentro de código Apex o JSON), escríbelas como `&#123;` y `&#125;` o como `('{'{'}` y `('}'}')` para que Astro no intente evaluarlas como JavaScript.

---

## 5. CSS Local (`article.css`)

Cada artículo importa `./article.css`. Este archivo está pensado para:
- Estilos de columnas o layouts personalizados.
- Héroes o banners singulares.
- Diagramas o visualizaciones específicas del tema.
- Media queries responsivos particulares.

`ArticleLayout` ya provee la tipografía base ceremonial (`<p>`, `<h2>`, `<h3>`, `<blockquote>`, `<pre>`, `<code>`, `<a>`), por lo que no necesitas redefinir lo global salvo que desees sobreescribirlo.

---

## 6. Imágenes Locales (`images/`)

Guarda los assets visuales del artículo en su propia carpeta `./images/`.

Ventajas:
- Si mueves o eliminas el artículo, sus imágenes van con él.
- Vite y Astro procesan y optimizan los assets automáticamente.

```astro
---
import diagram from './images/flow-diagram.webp';
---

<img src={diagram.src} alt="Diagrama de flujo de Trigger" width={diagram.width} height={diagram.height} />
```

---

## 7. Componentes Reutilizables Opcionales

Dentro de `src/components/article/` tienes a tu disposición helpers diseñados con la estética del Coven:

### 1. `Callout.astro`
Muestra una advertencia, nota o consejo ceremonial:
```astro
import Callout from '../../components/article/Callout.astro';

<Callout type="info" title="Incantation Note">
  Recuerda aislar la lógica en una clase Handler.
</Callout>

<Callout type="warning" title="Ward of Caution">
  Cuidado con la recursión al actualizar el mismo objeto.
</Callout>

<Callout type="tip" title="Craft Mastery">
  Utiliza colecciones Map para optimizar consultas SOQL.
</Callout>

<Callout type="note">
  Nota complementaria del grimorio.
</Callout>
```

### 2. `ImageGrid.astro`
Layout de imágenes en 2 o 3 columnas que pasa automáticamente a 1 columna en móvil:
```astro
import ImageGrid from '../../components/article/ImageGrid.astro';

<ImageGrid columns={2}>
  <img src={img1.src} alt="Paso 1" />
  <img src={img2.src} alt="Paso 2" />
</ImageGrid>
```

### 3. `Banner.astro`
Banner místico con título, descripción y llamada a la acción:
```astro
import Banner from '../../components/article/Banner.astro';

<Banner
  kicker="Grimorio Avanzado"
  title="Frameworks de Triggers"
  actionText="ABRIR SCROLL"
  actionUrl="/article/trigger-frameworks"
>
  Domina la arquitectura empresarial para orquestar múltiples objetos.
</Banner>
```

### 4. `CodeBlock.astro`
Bloque de código con barra superior y badge de lenguaje:
```astro
import CodeBlock from '../../components/article/CodeBlock.astro';

<CodeBlock title="AccountTrigger.cls" language="apex">
  trigger AccountTrigger on Account (before insert) ...
</CodeBlock>
```

### 5. `Exercise.astro`
Reto de práctica para aspirantes con recompensa de Aether y pista desplegable:
```astro
import Exercise from '../../components/article/Exercise.astro';

<Exercise
  title="Reto: Bloqueo de Recursión"
  aether="50"
  difficulty="Mechanic"
  hint="Usa un conjunto estático de IDs para evitar re-entradas."
>
  <p>Construye una guardia en tu handler que impida que el trigger se dispare más de una vez.</p>
</Exercise>
```

*(Todos estos componentes son 100% opcionales. Puedes prescindir de ellos y usar tu propio marcado HTML).*

---

## 8. ¿Cómo Funciona el Descubrimiento Automático?

El archivo `src/lib/articles.ts` utiliza `import.meta.glob`:
- Lee automáticamente todos los `src/articles/*/meta.ts`.
- Lee automáticamente todos los `src/articles/*/index.astro`.
- Descarta cualquier carpeta cuyo nombre empiece con guión bajo (como `_template`).
- El slug de la URL se extrae del nombre del directorio (`src/articles/{slug}/`).
- La ruta `src/pages/article/[slug].astro` genera automáticamente las páginas estáticas correspondientes mediante `getStaticPaths()`.
- Ni Home, ni Library, ni ningún array central necesitan modificarse al crear un artículo.
