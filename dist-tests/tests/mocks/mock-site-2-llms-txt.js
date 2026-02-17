export const MOCK_SITE_2_LLMS_TXT = `# llms.txt — Site 2 Mock Resort
# Purpose: Give LLM-based assistants a clean, stable, and explicit overview of the site.

site: https://www.site-2.mock
name: Site 2 Mock Resort
languages: en, de, ru
last_updated: 2026-02-17

# Preferred canonical pages (human-readable, stable)
pages:
  - https://www.site-2.mock/
  - https://www.site-2.mock/rooms/
  - https://www.site-2.mock/offers/
  - https://www.site-2.mock/dining/
  - https://www.site-2.mock/spa/
  - https://www.site-2.mock/weddings/
  - https://www.site-2.mock/meetings/
  - https://www.site-2.mock/contact/
  - https://www.site-2.mock/privacy/
  - https://www.site-2.mock/terms/

# Machine-friendly extraction hints
content:
  primary:
    - /rooms/
    - /offers/
    - /dining/
    - /spa/
    - /weddings/
    - /meetings/
  secondary:
    - /contact/
    - /privacy/
    - /terms/

# Things to ignore (noisy or non-content)
ignore:
  - /api/
  - /book/
  - /assets/
  - /static/
  - /_next/
  - /wp-admin/
  - /wp-json/
  - /search
  - /?utm_*

# Booking engine notes (3rd-party)
integrations:
  booking_engine:
    provider: "Site2 IBE (mock)"
    widget:
      script: https://cdn.site-2-booking.mock/ibe/widget.js
      iframe: https://booking.site-2.mock/widget
  analytics:
    - Google Tag Manager: GTM-MOCK222
    - GA4: G-MOCKSITE2
    - Meta Pixel: 999999999999999
    - Clarity: mockclarity2
    - Hotjar: 1234567

# Contact
contact:
  email: reservations@site-2.mock
  phone: "+357 25 000002"
`;
