export const MOCK_SITE_2_ROBOTS_TXT = `User-agent: *
Disallow: /api/
Disallow: /book/
Disallow: /checkout/
Disallow: /cart/
Disallow: /search
Disallow: /?utm_
Allow: /

# Intentionally no "Sitemap:" directive here to test sitemap discovery by default path.
`;
