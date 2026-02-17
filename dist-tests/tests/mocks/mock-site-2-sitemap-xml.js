export const MOCK_SITE_2_SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.site-2.mock/</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Note: includes trailing-slash paths and language variants to test normalization/deduping -->
  <url>
    <loc>https://www.site-2.mock/rooms/</loc>
    <lastmod>2026-02-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://www.site-2.mock/offers/</loc>
    <lastmod>2026-02-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://www.site-2.mock/dining/</loc>
    <lastmod>2026-02-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://www.site-2.mock/spa/</loc>
    <lastmod>2026-01-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://www.site-2.mock/contact/</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

  <!-- Language variants (should be valid pages but might be filtered depending on rules) -->
  <url>
    <loc>https://www.site-2.mock/de/</loc>
    <lastmod>2026-02-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>https://www.site-2.mock/ru/</loc>
    <lastmod>2026-02-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.3</priority>
  </url>

  <!-- Noisy URL to ensure crawler ignores disallowed patterns (query params) -->
  <url>
    <loc>https://www.site-2.mock/?utm_source=sitemap&utm_medium=organic</loc>
    <lastmod>2026-02-16</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.1</priority>
  </url>
</urlset>
`;
