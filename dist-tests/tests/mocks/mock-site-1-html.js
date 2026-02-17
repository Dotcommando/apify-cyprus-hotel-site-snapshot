export const MOCK_SITE_1_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>Site One Resort & Spa — Luxury Seafront Hotel</title>
    <meta
      name="description"
      content="A luxury seafront resort with private villas, fine dining, signature spa, and direct booking offers."
    />
    <link rel="canonical" href="https://www.site-1.mock/" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Site One Resort & Spa" />
    <meta property="og:title" content="Site One Resort & Spa — Luxury Seafront Hotel" />
    <meta
      property="og:description"
      content="Direct booking, villas, suites, spa rituals, and curated experiences by the sea."
    />
    <meta property="og:url" content="https://www.site-1.mock/" />
    <meta property="og:image" content="https://www.site-1.mock/assets/og/home.jpg" />

    <link rel="alternate" hreflang="en" href="https://www.site-1.mock/" />
    <link rel="alternate" hreflang="el" href="https://www.site-1.mock/el/" />
    <link rel="alternate" hreflang="x-default" href="https://www.site-1.mock/" />

    <link rel="preconnect" href="https://www.googletagmanager.com" />
    <link rel="preconnect" href="https://www.google-analytics.com" />
    <link rel="preconnect" href="https://connect.facebook.net" />
    <link rel="preconnect" href="https://www.googleadservices.com" />
    <link rel="preconnect" href="https://www.recaptcha.net" />
    <link rel="preconnect" href="https://client.crisp.chat" />

    <link rel="icon" href="https://www.site-1.mock/assets/favicon.ico" />
    <link rel="stylesheet" href="https://www.site-1.mock/assets/app.css?v=20260217" />

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Hotel",
        "name": "Site One Resort & Spa",
        "url": "https://www.site-1.mock/",
        "telephone": "+357-25-123456",
        "email": "reservations@site-1.mock",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "1 Seafront Avenue",
          "addressLocality": "Limassol",
          "postalCode": "3100",
          "addressCountry": "CY"
        },
        "starRating": { "@type": "Rating", "ratingValue": "5" },
        "amenityFeature": [
          { "@type": "LocationFeatureSpecification", "name": "Spa", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Private Pool Villas", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Fine Dining", "value": true }
        ],
        "sameAs": [
          "https://www.facebook.com/site1resort",
          "https://www.instagram.com/site1resort"
        ]
      }
    </script>

    <!-- Cookie consent (mock) -->
    <script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid="00000000-0000-0000-0000-000000000001"
      data-blockingmode="auto"
      type="text/javascript"
    ></script>

    <!-- Google Tag Manager (mock) -->
    <script>
      (function (w, d, s, l, i) {
        w[l] = w[l] || [];
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f.parentNode.insertBefore(j, f);
      })(window, document, 'script', 'dataLayer', 'GTM-MOCKS1');
    </script>

    <!-- GA4 (mock) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MOCKGA41"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', 'G-MOCKGA41', {
        anonymize_ip: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: false
      });
    </script>

    <!-- Google Ads (mock) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=AW-MOCKADS1"></script>
    <script>
      gtag('config', 'AW-MOCKADS1');
      gtag('event', 'page_view', { send_to: 'AW-MOCKADS1' });
    </script>

    <!-- Meta Pixel (mock) -->
    <script>
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', 'MOCKPIXEL1');
      fbq('track', 'PageView');
    </script>

    <!-- Microsoft Clarity (mock) -->
    <script>
      (function (c, l, a, r, i, t, y) {
        c[a] =
          c[a] ||
          function () {
            (c[a].q = c[a].q || []).push(arguments);
          };
        t = l.createElement(r);
        t.async = 1;
        t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', 'mockclarity1');
    </script>

    <!-- Hotjar (mock) -->
    <script>
      (function (h, o, t, j, a, r) {
        h.hj =
          h.hj ||
          function () {
            (h.hj.q = h.hj.q || []).push(arguments);
          };
        h._hjSettings = { hjid: 9999999, hjsv: 6 };
        a = o.getElementsByTagName('head')[0];
        r = o.createElement('script');
        r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
    </script>

    <!-- reCAPTCHA (mock) -->
    <script async defer src="https://www.recaptcha.net/recaptcha/api.js?render=MOCK_RECAPTCHA_SITE_KEY"></script>

    <!-- Live chat (Crisp mock) -->
    <script>
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = 'mock-crisp-website-id-1';
      (function () {
        var d = document;
        var s = d.createElement('script');
        s.src = 'https://client.crisp.chat/l.js';
        s.async = 1;
        d.getElementsByTagName('head')[0].appendChild(s);
      })();
    </script>

    <!-- Booking engine widget (mock provider) -->
    <script defer src="https://bookings.site-1.mock/widget/v1.js" data-hotel-code="S1MOCK"></script>
  </head>

  <body>
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MOCKS1" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

    <header class="header">
      <div class="topbar">
        <div class="topbar-left">
          <a href="tel:+35725123456" class="topbar-link" data-track="phone">+357 25 123 456</a>
          <a href="mailto:reservations@site-1.mock" class="topbar-link" data-track="email">reservations@site-1.mock</a>
        </div>
        <div class="topbar-right">
          <a class="topbar-link" href="https://wa.me/35725123456" rel="noopener" target="_blank" data-track="whatsapp">WhatsApp</a>
          <a class="topbar-link" href="/contact/" data-track="contact">Contact</a>
          <a class="topbar-link" href="/el/" data-track="lang">Ελληνικά</a>
        </div>
      </div>

      <nav class="nav">
        <a class="brand" href="https://www.site-1.mock/">
          <img src="https://www.site-1.mock/assets/logo.svg" alt="Site One Resort & Spa" />
        </a>
        <ul class="nav-links">
          <li><a href="/rooms/" data-nav="rooms">Rooms & Villas</a></li>
          <li><a href="/dining/" data-nav="dining">Dining</a></li>
          <li><a href="/spa/" data-nav="spa">Spa</a></li>
          <li><a href="/offers/" data-nav="offers">Offers</a></li>
          <li><a href="/weddings/" data-nav="weddings">Weddings</a></li>
          <li><a href="/experiences/" data-nav="experiences">Experiences</a></li>
        </ul>

        <div class="nav-cta">
          <a class="btn btn-secondary" href="/offers/direct-booking/" data-cta="direct-offer">Direct Offer</a>
          <button class="btn btn-primary" id="open-booking" data-cta="book-now">Book Now</button>
        </div>
      </nav>
    </header>

    <main>
      <section class="hero" aria-label="Hero">
        <div class="hero-media">
          <video autoplay muted loop playsinline poster="https://www.site-1.mock/assets/hero/poster.jpg">
            <source src="https://www.site-1.mock/assets/hero/hero.mp4" type="video/mp4" />
          </video>
        </div>
        <div class="hero-content">
          <h1>Luxury by the Sea</h1>
          <p>Private villas, signature spa rituals, and curated experiences in Cyprus.</p>

          <div class="hero-search" data-booking-widget>
            <form id="booking-form">
              <label>
                Check-in
                <input type="date" name="checkin" />
              </label>
              <label>
                Check-out
                <input type="date" name="checkout" />
              </label>
              <label>
                Guests
                <select name="guests">
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>
              <button type="submit" class="btn btn-primary" data-track="booking-submit">Search</button>
              <input type="hidden" name="promo" value="DIRECT10" />
            </form>
            <p class="hero-note">Best Rate Guarantee · Free cancellation on select rates · No OTA fees</p>
          </div>
        </div>
      </section>

      <section class="trust" aria-label="Trust & Awards">
        <div class="trust-grid">
          <div class="trust-item">
            <span class="badge">5-Star Resort</span>
            <span class="badge">Adults-friendly zones</span>
            <span class="badge">Private pool villas</span>
          </div>

          <div class="trust-item">
            <div id="tripadvisor-widget">
              <div id="TA_certificateOfExcellence" class="TA_certificateOfExcellence">
                <ul id="mockTaList">
                  <li id="mockTaItem">
                    <a target="_blank" rel="noopener" href="https://www.tripadvisor.com/">
                      <img src="https://www.site-1.mock/assets/badges/tripadvisor.svg" alt="Tripadvisor Badge" />
                    </a>
                  </li>
                </ul>
              </div>
              <script async src="https://www.jscache.com/wejs?wtype=certificateOfExcellence&uniq=123&locationId=9999999&lang=en_US&display_version=2"></script>
            </div>
          </div>

          <div class="trust-item">
            <a href="/reviews/" class="reviews-link" data-track="reviews">
              <strong>4.8/5</strong> Guest rating · Verified reviews
            </a>
          </div>
        </div>
      </section>

      <section class="cards" aria-label="Highlights">
        <div class="card">
          <h2>Rooms & Villas</h2>
          <p>Sea-view suites, private garden villas, and family residences.</p>
          <a href="/rooms/" class="link" data-track="rooms">Explore accommodation →</a>
        </div>
        <div class="card">
          <h2>Dining</h2>
          <p>Mediterranean fine dining, beachfront grill, and wine cellar tastings.</p>
          <a href="/dining/" class="link" data-track="dining">See restaurants →</a>
        </div>
        <div class="card">
          <h2>Spa & Wellness</h2>
          <p>Signature rituals, hammam, and sunrise yoga by the sea.</p>
          <a href="/spa/" class="link" data-track="spa">Discover spa →</a>
        </div>
      </section>

      <section class="lead" aria-label="Newsletter">
        <div class="lead-inner">
          <h2>Unlock direct booking perks</h2>
          <p>Join our newsletter to receive exclusive offers and seasonal benefits.</p>
          <form id="newsletter" action="/api/newsletter" method="post">
            <label>
              Email
              <input name="email" type="email" placeholder="name@email.com" required />
            </label>
            <button class="btn btn-primary" type="submit" data-track="newsletter-submit">Subscribe</button>
            <small>Protected by reCAPTCHA</small>
          </form>
        </div>
      </section>

      <section class="events" aria-label="Weddings & Events">
        <div class="events-inner">
          <h2>Weddings & Celebrations</h2>
          <p>Oceanfront venues, tailored menus, and dedicated planners.</p>
          <a class="btn btn-secondary" href="/weddings/" data-track="weddings-cta">Wedding brochure</a>
          <a class="btn btn-primary" href="/weddings/inquiry/" data-track="weddings-inquiry">Request proposal</a>
        </div>
      </section>

      <section class="footer-links" aria-label="Quick links">
        <div class="footer-grid">
          <div>
            <h3>Hotel</h3>
            <ul>
              <li><a href="/about/" data-track="about">About</a></li>
              <li><a href="/location/" data-track="location">Location</a></li>
              <li><a href="/gallery/" data-track="gallery">Gallery</a></li>
              <li><a href="/careers/" data-track="careers">Careers</a></li>
            </ul>
          </div>
          <div>
            <h3>Policies</h3>
            <ul>
              <li><a href="/privacy/" data-track="privacy">Privacy</a></li>
              <li><a href="/cookies/" data-track="cookies">Cookies</a></li>
              <li><a href="/terms/" data-track="terms">Terms</a></li>
              <li><a href="/accessibility/" data-track="accessibility">Accessibility</a></li>
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <p>1 Seafront Avenue, Limassol, Cyprus</p>
            <p><a href="tel:+35725123456">+357 25 123 456</a></p>
            <p><a href="mailto:reservations@site-1.mock">reservations@site-1.mock</a></p>
            <p><a href="https://www.site-1.mock/contact/" data-track="contact-footer">Contact form</a></p>
          </div>
          <div>
            <h3>Social</h3>
            <ul>
              <li><a href="https://www.facebook.com/site1resort" rel="noopener" target="_blank">Facebook</a></li>
              <li><a href="https://www.instagram.com/site1resort" rel="noopener" target="_blank">Instagram</a></li>
              <li><a href="https://www.youtube.com/@site1resort" rel="noopener" target="_blank">YouTube</a></li>
            </ul>
          </div>
        </div>

        <link rel="sitemap" type="application/xml" title="Sitemap" href="https://www.site-1.mock/mock-site-sitemap.xml" />
      </section>
    </main>

    <footer class="footer">
      <p>© 2026 Site One Resort & Spa. All rights reserved.</p>
    </footer>

    <script>
      document.getElementById('open-booking')?.addEventListener('click', function () {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'booking_open' });
        if (window.gtag) {
          window.gtag('event', 'begin_checkout', { currency: 'EUR', value: 0 });
        }
      });

      document.getElementById('booking-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'booking_search_submit' });
        if (window.fbq) window.fbq('track', 'Lead');
      });
    </script>
  </body>
</html>
`;
