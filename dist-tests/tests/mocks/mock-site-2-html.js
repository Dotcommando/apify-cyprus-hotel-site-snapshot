export const MOCK_SITE_2_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Site 2 Mock Resort — Official Website</title>

  <meta name="description" content="Mock beachfront resort on Cyprus. Book direct, enjoy member rates, spa, restaurants and events." />
  <meta property="og:title" content="Site 2 Mock Resort" />
  <meta property="og:description" content="Book direct for best rates. Spa, dining, weddings and meetings." />
  <meta property="og:url" content="https://www.site-2.mock/" />
  <meta property="og:type" content="website" />

  <link rel="canonical" href="https://www.site-2.mock/" />
  <link rel="alternate" hreflang="en" href="https://www.site-2.mock/" />
  <link rel="alternate" hreflang="de" href="https://www.site-2.mock/de/" />
  <link rel="alternate" hreflang="ru" href="https://www.site-2.mock/ru/" />
  <link rel="alternate" hreflang="x-default" href="https://www.site-2.mock/" />

  <!-- PWA-ish hints -->
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#0b3d55" />

  <!-- Preconnect/dns-prefetch to test detection of 3rd-party integrations -->
  <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin />
  <link rel="dns-prefetch" href="//connect.facebook.net" />
  <link rel="dns-prefetch" href="//static.hotjar.com" />
  <link rel="dns-prefetch" href="//widget.trustpilot.com" />
  <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />

  <!-- Consent manager stub (CMP) -->
  <script>
    window.__cmp = window.__cmp || function() {
      (window.__cmp.q = window.__cmp.q || []).push(arguments);
    };
    window.__tcfapi = window.__tcfapi || function() {
      (window.__tcfapi.q = window.__tcfapi.q || []).push(arguments);
    };
  </script>

  <!-- Google Tag Manager -->
  <script>
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
    f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MOCK222');
  </script>

  <!-- GA4 (direct) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MOCKSITE2"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-MOCKSITE2', { anonymize_ip: true });
  </script>

  <!-- Meta Pixel -->
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','999999999999999');
    fbq('track','PageView');
  </script>
  <noscript>
    <img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=999999999999999&ev=PageView&noscript=1"/>
  </noscript>

  <!-- Microsoft Clarity -->
  <script>
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "mockclarity2");
  </script>

  <!-- Hotjar -->
  <script>
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:1234567,hjsv:6};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  </script>

  <!-- Booking engine embed (iframe-ish) -->
  <script defer src="https://cdn.site-2-booking.mock/ibe/widget.js" data-hotel="SITE2" data-locale="en"></script>

  <!-- JSON-LD: Hotel + Breadcrumb + FAQ (more varied structured data) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Site 2 Mock Resort",
    "url": "https://www.site-2.mock/",
    "telephone": "+357 25 000002",
    "email": "reservations@site-2.mock",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "2 Mock Beach Avenue",
      "addressLocality": "Limassol",
      "postalCode": "3102",
      "addressCountry": "CY"
    },
    "starRating": {"@type":"Rating","ratingValue":"5"},
    "amenityFeature": [
      {"@type":"LocationFeatureSpecification","name":"Spa","value": true},
      {"@type":"LocationFeatureSpecification","name":"Pool","value": true},
      {"@type":"LocationFeatureSpecification","name":"Gym","value": true}
    ],
    "sameAs": [
      "https://www.instagram.com/site2mockresort",
      "https://www.facebook.com/site2mockresort",
      "https://www.linkedin.com/company/site2mockresort"
    ]
  }
  </script>

  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":"https://www.site-2.mock/"},
      {"@type":"ListItem","position":2,"name":"Rooms","item":"https://www.site-2.mock/rooms/"}
    ]
  }
  </script>

  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      {"@type":"Question","name":"Do you offer airport transfers?","acceptedAnswer":{"@type":"Answer","text":"Yes, on request."}},
      {"@type":"Question","name":"Is breakfast included?","acceptedAnswer":{"@type":"Answer","text":"Breakfast is included in selected rates."}}
    ]
  }
  </script>

  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;color:#0b2430}
    header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e6eef2;z-index:50}
    .bar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px}
    .logo{font-weight:700;letter-spacing:.2px}
    nav a{margin:0 8px;color:#0b3d55;text-decoration:none}
    .hero{padding:26px 16px;background:linear-gradient(180deg,#e8f4f8,#ffffff)}
    .cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    .btn{padding:10px 14px;border-radius:10px;border:1px solid #0b3d55;background:#0b3d55;color:#fff;text-decoration:none}
    .btn.secondary{background:#fff;color:#0b3d55}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:18px 16px}
    .card{border:1px solid #e6eef2;border-radius:14px;padding:14px;background:#fff}
    footer{padding:18px 16px;border-top:1px solid #e6eef2;color:#46626e}
    .sr-only{position:absolute;left:-9999px}
  </style>
</head>

<body>
  <!-- GTM noscript -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MOCK222"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <!-- Consent banner with non-trivial structure, to test dismiss logic -->
  <div id="cookie-consent-root" data-cmp="mockCMP">
    <div role="dialog" aria-label="Privacy preferences" style="position:fixed;left:0;right:0;bottom:0;background:#0b2430;color:#fff;padding:14px;z-index:99999">
      <div style="max-width:980px;margin:0 auto;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <strong>We value your privacy</strong>
          <div style="opacity:.9;font-size:14px;margin-top:6px">
            We use cookies for analytics, personalization and marketing. You can accept all, reject, or manage preferences.
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button type="button" id="cmp-manage" aria-label="Manage preferences">Manage</button>
          <button type="button" id="cmp-reject" aria-label="Reject all">Reject</button>
          <button type="button" id="cmp-accept" aria-label="Accept all">Accept all</button>
        </div>
      </div>
    </div>
  </div>

  <header>
    <div class="bar">
      <div class="logo">Site 2 Mock Resort</div>
      <nav aria-label="Primary">
        <a href="/rooms/">Rooms</a>
        <a href="/dining/">Dining</a>
        <a href="/spa/">Spa</a>
        <a href="/weddings/">Weddings</a>
        <a href="/meetings/">Meetings</a>
        <a href="/offers/">Offers</a>
        <a href="/contact/">Contact</a>
      </nav>
      <a class="btn" href="/book/?utm_source=site&utm_medium=nav&utm_campaign=direct_booking">Book</a>
    </div>
  </header>

  <main>
    <section class="hero">
      <h1>Beachfront luxury, direct booking benefits</h1>
      <p>Member rates, flexible cancellation on selected offers, and exclusive add-ons when you book on our official website.</p>
      <div class="cta">
        <a class="btn" href="/book/?checkin=2026-03-10&checkout=2026-03-15">Book direct</a>
        <a class="btn secondary" href="/offers/">View offers</a>
        <a class="btn secondary" href="https://wa.me/35725000002?text=Hello%20Site%202%20Mock%20Resort">WhatsApp</a>
      </div>
      <div style="margin-top:18px">
        <iframe title="Booking widget" src="https://booking.site-2.mock/widget?hotel=SITE2&locale=en" width="100%" height="180" loading="lazy" style="border:1px solid #e6eef2;border-radius:12px;background:#fff"></iframe>
      </div>
    </section>

    <section class="grid" aria-label="Highlights">
      <article class="card">
        <h2>Rooms & Suites</h2>
        <p>Sea view rooms, family suites and private pool villas.</p>
        <a href="/rooms/">Explore rooms</a>
      </article>
      <article class="card">
        <h2>Dining</h2>
        <p>Mediterranean cuisine, rooftop bar and all-day dining.</p>
        <a href="/dining/">Discover dining</a>
      </article>
      <article class="card">
        <h2>Spa & Wellness</h2>
        <p>Signature treatments, sauna, hammam and a modern gym.</p>
        <a href="/spa/">Explore spa</a>
      </article>
      <article class="card">
        <h2>Weddings & Events</h2>
        <p>Seaside ceremonies, curated menus and event planning.</p>
        <a href="/weddings/">Plan your event</a>
      </article>
    </section>

    <!-- Reviews widget embed (3rd-party) -->
    <section class="grid" aria-label="Reviews">
      <article class="card">
        <h2>Guest reviews</h2>
        <div id="trustpilot-widget" data-template-id="mock" data-businessunit-id="mock-site-2"></div>
        <script defer src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"></script>
        <p class="sr-only">Trustpilot reviews widget</p>
      </article>
      <article class="card">
        <h2>Awards</h2>
        <img alt="Traveller's Choice Award" src="https://cdn.site-2.mock/assets/awards/travellers-choice.svg" width="160" height="48" loading="lazy" />
        <p>Recognized by major travel platforms for exceptional hospitality.</p>
      </article>
    </section>

    <!-- Contact form with recaptcha + hidden fields -->
    <section class="grid" aria-label="Contact">
      <article class="card">
        <h2>Contact us</h2>
        <form method="post" action="/api/contact">
          <input type="hidden" name="source" value="homepage" />
          <label>
            Name
            <input name="name" autocomplete="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" autocomplete="email" required />
          </label>
          <label>
            Message
            <textarea name="message" rows="4" required></textarea>
          </label>
          <div class="g-recaptcha" data-sitekey="MOCK_RECAPTCHA_SITEKEY"></div>
          <button type="submit">Send</button>
        </form>
        <script async defer src="https://www.google.com/recaptcha/api.js"></script>
      </article>

      <article class="card">
        <h2>Newsletter</h2>
        <p>Get seasonal offers and member-only perks.</p>
        <form method="post" action="/api/newsletter">
          <input type="email" name="email" placeholder="you@example.com" required />
          <button type="submit">Subscribe</button>
        </form>
      </article>
    </section>
  </main>

  <footer>
    <div><strong>Site 2 Mock Resort</strong></div>
    <div>2 Mock Beach Avenue, Limassol 3102, Cyprus</div>
    <div>
      <a href="mailto:reservations@site-2.mock">reservations@site-2.mock</a>
      · <a href="tel:+35725000002">+357 25 000002</a>
    </div>
    <div style="margin-top:10px">
      <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/accessibility/">Accessibility</a>
    </div>
  </footer>

  <!-- Live chat widget (different vendor) -->
  <script>
    window.$crisp=[];
    window.CRISP_WEBSITE_ID="mock-crisp-site2";
    (function(){var d=document;var s=d.createElement("script");
    s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
  </script>
</body>
</html>`;
