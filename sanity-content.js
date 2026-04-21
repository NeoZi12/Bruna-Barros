/**
 * sanity-content.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches all website content from Sanity's public CDN and updates the DOM.
 * Works without any build step — plain fetch() calls from a <script defer> tag.
 *
 * MULTI-LANGUAGE:
 *   The current language comes from window.getCurrentLang() (defined in
 *   script.js). Translatable fields are stored in Sanity as i18nString /
 *   i18nText / i18nPortableText objects: { en, pt, es, ptLocked, esLocked, ... }.
 *   pickLang() pulls the right language's value and falls back to English.
 *
 *   Legacy plain strings in existing documents are tolerated — pickLang returns
 *   them as-is so the site keeps working during a progressive data migration.
 *
 * FALLBACK:
 *   If Sanity returns no data for a section, the static HTML in index.html
 *   is left untouched. The site always renders correctly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. CONFIGURATION ──────────────────────────────────────────────────────────

const SANITY_PROJECT_ID = "u3pno5p8";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2024-01-01";

// ── 2. CORE FETCH HELPER ──────────────────────────────────────────────────────

async function fetchFromSanity(query) {
  const url =
    `https://${SANITY_PROJECT_ID}.api.sanity.io` +
    `/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}` +
    `?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `[Sanity] API error ${response.status}: ${response.statusText}`,
      );
      return null;
    }
    const json = await response.json();
    return json.result ?? null;
  } catch (err) {
    console.warn("[Sanity] Fetch failed — using static HTML:", err.message);
    return null;
  }
}

// ── 3. URL BUILDERS ───────────────────────────────────────────────────────────

function sanityImageUrl(ref, width) {
  const withoutPrefix = ref.replace(/^image-/, "");
  const parts = withoutPrefix.split("-");
  const ext = parts.pop();
  const filename = parts.join("-");

  let url =
    `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}` +
    `/${filename}.${ext}`;

  if (width) url += `?w=${width}&auto=format&fit=crop`;
  return url;
}

function sanityFileUrl(ref) {
  const withoutPrefix = ref.replace(/^file-/, "");
  const parts = withoutPrefix.split("-");
  const ext = parts.pop();
  const id = parts.join("-");

  return `https://cdn.sanity.io/files/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}.${ext}`;
}

// ── 4. LANGUAGE PICKER ────────────────────────────────────────────────────────

/**
 * Returns the requested-language value from a translatable field.
 *
 * Handles three shapes for robustness:
 *   1. i18nString / i18nText object → { en, pt, es, ... }. Picks field[lang]
 *      and falls back to field.en if empty.
 *   2. i18nPortableText object → { en: [blocks], pt: [blocks], ... }. Same logic.
 *   3. Legacy plain string or array (pre-i18n data) → returned as-is so existing
 *      content keeps rendering while a migration/seed runs.
 */
function pickLang(field, lang) {
  if (field == null) return "";
  if (typeof field === "string") return field; // legacy plain string
  if (Array.isArray(field)) return field; // legacy Portable Text (array of blocks)
  const val = field[lang];
  if (val != null && (typeof val === "string" ? val.trim() : val.length > 0)) {
    return val;
  }
  return field.en ?? "";
}

// ── 5. PORTABLE TEXT RENDERER ─────────────────────────────────────────────────

function renderPortableText(blocks) {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .filter((block) => block._type === "block")
    .map((block) => {
      const innerHtml = (block.children || [])
        .map((span) => {
          let text = span.text || "";
          if (span.marks?.includes("strong")) text = `<strong>${text}</strong>`;
          if (span.marks?.includes("em")) text = `<em>${text}</em>`;
          return text;
        })
        .join("");
      return `<p>${innerHtml}</p>`;
    })
    .join("\n");
}

// ── 6. HTML TEMPLATES ─────────────────────────────────────────────────────────

function pricingColumnHtml(pkg, lang) {
  const featuredClass = pkg.featured ? " pricing-col--featured" : "";
  const badgeLabel = pickLang(pkg.badgeLabel, lang) || "★ Most Popular";
  const badge = pkg.featured
    ? `<span class="pricing-badge">${escapeHtml(badgeLabel)}</span>`
    : "";

  const featureItems = (pkg.features || [])
    .map((f) => `<li>${escapeHtml(pickLang(f, lang))}</li>`)
    .join("\n              ");

  return `
          <div class="pricing-col${featuredClass}">
            <div class="pricing-inner">
              ${badge}
              <span class="pricing-name">${escapeHtml(pickLang(pkg.name, lang))}</span>
              <span class="pricing-price">${escapeHtml(pickLang(pkg.priceLabel, lang))}</span>
              <ul class="pricing-features">
              ${featureItems}
              </ul>
              <p class="pricing-target">${escapeHtml(pickLang(pkg.targetDescription, lang))}</p>
              <a href="#contact" class="pricing-cta">${escapeHtml(pickLang(pkg.ctaLabel, lang) || "Get Started")}</a>
            </div>
          </div>`;
}

function portfolioItemHtml(video, lang) {
  const videoUrl = video.videoFile?.asset?._ref
    ? sanityFileUrl(video.videoFile.asset._ref)
    : "";
  const posterUrl = video.posterImage?.asset?._ref
    ? sanityImageUrl(video.posterImage.asset._ref, 560)
    : "";
  const label = escapeHtml(pickLang(video.label, lang));

  if (!videoUrl) return "";

  return `
          <div class="portfolio-item">
            <div class="portfolio-phone">
              <div class="phone-screen">
                <media-player
                  class="portfolio-video"
                  src="${videoUrl}"
                  poster="${posterUrl}"
                  playsinline
                  load="visible"
                  volume="0.5"
                >
                  <media-provider>
                    <media-poster src="${posterUrl}"></media-poster>
                  </media-provider>
                  <media-video-layout></media-video-layout>
                </media-player>
              </div>
              <div class="top"></div>
              <div class="speaker"></div>
              <div class="camera"><div class="int"></div></div>
              <div class="btn1"></div>
              <div class="btn2"></div>
              <div class="btn3"></div>
            </div>
            <p class="portfolio-label">${label}</p>
          </div>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 7. SECTION LOADERS ────────────────────────────────────────────────────────

// Each loader accepts the current language. Every GROQ query asks for the
// full i18n object (en, pt, es) so we can pick in JS and also hot-swap
// languages in-place without re-fetching when the user toggles the switcher.

async function loadSiteSettings(lang) {
  const s = await fetchFromSanity(`
    *[_type == "siteSettings" && _id == "siteSettings"][0] {
      brandName, email, instagramUrl, youtubeUrl, tiktokUrl, footerText
    }
  `);
  if (!s) return;

  const brandName = pickLang(s.brandName, lang);
  if (brandName) {
    const brand = document.querySelector(".nav-brand");
    if (brand) brand.textContent = brandName;
  }

  if (s.email) {
    const heroEmail = document.querySelector(".hero-email");
    if (heroEmail) {
      heroEmail.href = `mailto:${s.email}`;
      heroEmail.textContent = s.email;
    }
  }

  const heroSocials = document.querySelector(".hero-socials");
  if (heroSocials) {
    const links = heroSocials.querySelectorAll("a");
    const socials = [s.instagramUrl, s.youtubeUrl, s.tiktokUrl];
    links.forEach((a, i) => {
      if (socials[i]) a.href = socials[i];
    });
  }

  if (s.email) {
    const contactBtn = document.querySelector(".section-contact .btn-outline");
    if (contactBtn) {
      contactBtn.href = `mailto:${s.email}`;
      contactBtn.textContent = s.email;
    }
  }

  const contactSocials = document.querySelector(".contact-socials");
  if (contactSocials) {
    const links = contactSocials.querySelectorAll("a");
    const socials = [s.instagramUrl, s.youtubeUrl, s.tiktokUrl];
    links.forEach((a, i) => {
      if (socials[i]) a.href = socials[i];
    });
  }

  const footerText = pickLang(s.footerText, lang);
  if (footerText) {
    const footer = document.querySelector(".footer p");
    if (footer) footer.textContent = footerText;
  }
}

async function loadHero(lang) {
  const hero = await fetchFromSanity(`
    *[_type == "hero" && _id == "hero"][0] {
      firstName,
      lastName,
      role,
      heroImage { asset { _ref } }
    }
  `);
  if (!hero) return;

  const firstName = pickLang(hero.firstName, lang);
  const lastName = pickLang(hero.lastName, lang);
  if (firstName || lastName) {
    const nameEl = document.querySelector(".hero-name");
    if (nameEl) {
      nameEl.innerHTML = `${escapeHtml(firstName)}<br>${escapeHtml(lastName)}`;
    }
  }

  const role = pickLang(hero.role, lang);
  if (role) {
    const subtitleEl = document.querySelector(".hero-subtitle");
    if (subtitleEl) {
      if (role.includes("&")) {
        const [before, after] = role.split("&").map((s) => s.trim());
        subtitleEl.innerHTML = `${escapeHtml(before)} <span class="amp">&amp;</span> ${escapeHtml(after)}`;
      } else {
        subtitleEl.textContent = role;
      }
    }
  }

  if (hero.heroImage?.asset?._ref) {
    const imgEl = document.querySelector(".hero-portrait img");
    if (imgEl) {
      imgEl.src = sanityImageUrl(hero.heroImage.asset._ref, 720);
      imgEl.alt = `${firstName} ${lastName}`.trim();
    }
  }
}

async function loadAbout(lang) {
  const about = await fetchFromSanity(`
    *[_type == "about" && _id == "about"][0] {
      heading,
      body
    }
  `);
  if (!about) return;

  const textContainer = document.querySelector(".about-text");
  if (!textContainer) return;

  const heading = pickLang(about.heading, lang);
  if (heading) {
    const h2 = textContainer.querySelector("h2");
    if (h2) h2.textContent = heading;
  }

  const body = pickLang(about.body, lang);
  if (Array.isArray(body) && body.length > 0) {
    textContainer.querySelectorAll("p").forEach((p) => p.remove());
    textContainer.insertAdjacentHTML("beforeend", renderPortableText(body));
  }
}

async function loadServices(lang) {
  const data = await fetchFromSanity(`
    *[_type == "services" && _id == "services"][0] {
      sectionTitle,
      items[] { title, description }
    }
  `);
  if (!data) return;

  const sectionTitle = pickLang(data.sectionTitle, lang);
  if (sectionTitle) {
    const h2 = document.querySelector(".section-services h2");
    if (h2) h2.textContent = sectionTitle;
  }

  if (Array.isArray(data.items) && data.items.length > 0) {
    const grid = document.querySelector(".services-grid");
    if (grid) {
      grid.innerHTML = data.items
        .map(
          (item) => `
          <div class="service-card">
            <h3>${escapeHtml(pickLang(item.title, lang))}</h3>
            <p>${escapeHtml(pickLang(item.description, lang))}</p>
          </div>`,
        )
        .join("\n");
    }
  }
}

async function loadPricing(lang) {
  const data = await fetchFromSanity(`
    *[_type == "pricing" && _id == "pricing"][0] {
      sectionTitle,
      introText,
      packages[] {
        name, priceLabel, features, targetDescription,
        featured, badgeLabel, ctaLabel
      }
    }
  `);
  if (!data) return;

  const sectionTitle = pickLang(data.sectionTitle, lang);
  if (sectionTitle) {
    const h2 = document.querySelector(".section-investment h2");
    if (h2) h2.textContent = sectionTitle;
  }

  const introText = pickLang(data.introText, lang);
  if (introText) {
    const sub = document.querySelector(".investment-sub");
    if (sub) sub.textContent = introText;
  }

  if (Array.isArray(data.packages) && data.packages.length > 0) {
    const grid = document.querySelector(".pricing-grid");
    if (grid) {
      grid.innerHTML = data.packages
        .map((pkg) => pricingColumnHtml(pkg, lang))
        .join("\n");
    }
  }
}

async function loadStats(lang) {
  const data = await fetchFromSanity(`
    *[_type == "stats" && _id == "stats"][0] {
      items[] { value, label }
    }
  `);
  if (!data?.items?.length) return;

  const grid = document.querySelector(".stats-grid");
  if (!grid) return;

  grid.innerHTML = data.items
    .map(
      (stat) => `
          <div class="stat">
            <span class="stat-number">${escapeHtml(stat.value || "")}</span>
            <span class="stat-label">${escapeHtml(pickLang(stat.label, lang))}</span>
          </div>`,
    )
    .join("\n");
}

async function loadPortfolio(lang) {
  const data = await fetchFromSanity(`
    *[_type == "portfolio" && _id == "portfolio"][0] {
      sectionTitle,
      videos[] {
        label,
        videoFile { asset { _ref } },
        posterImage { asset { _ref } }
      }
    }
  `);
  if (!data) return;

  const sectionTitle = pickLang(data.sectionTitle, lang);
  if (sectionTitle) {
    const h2 = document.querySelector(".section-portfolio h2");
    if (h2) h2.textContent = sectionTitle;
  }

  if (Array.isArray(data.videos) && data.videos.length > 0) {
    const grid = document.querySelector(".portfolio-grid");
    if (grid) {
      grid.innerHTML = data.videos
        .map((v) => portfolioItemHtml(v, lang))
        .join("\n");

      if (typeof window.observePortfolioPhones === "function") {
        window.observePortfolioPhones();
      }
    }
  }
}

async function loadPhotography(lang) {
  const data = await fetchFromSanity(`
    *[_type == "photography" && _id == "photography"][0] {
      sectionTitle,
      photos[] { alt, asset { _ref } }
    }
  `);
  if (!data) return;

  const sectionTitle = pickLang(data.sectionTitle, lang);
  if (sectionTitle) {
    const h2 = document.querySelector(".section-photography h2");
    if (h2) h2.textContent = sectionTitle;
  }

  if (Array.isArray(data.photos) && data.photos.length > 0) {
    const grid = document.querySelector(".photo-grid");
    if (grid) {
      grid.innerHTML = data.photos
        .filter((p) => p.asset?._ref)
        .map(
          (p) => `
          <div class="photo-tile">
            <img
              src="${sanityImageUrl(p.asset._ref, 800)}"
              alt="${escapeHtml(pickLang(p.alt, lang))}"
            />
          </div>`,
        )
        .join("\n");
    }
  }
}

async function loadHowItWorks(lang) {
  const data = await fetchFromSanity(`
    *[_type == "howItWorks" && _id == "howItWorks"][0] {
      sectionTitle,
      steps[] { stepNumber, title, description }
    }
  `);
  if (!data) return;

  const sectionTitle = pickLang(data.sectionTitle, lang);
  if (sectionTitle) {
    const h2 = document.querySelector(".section-how h2");
    if (h2) h2.textContent = sectionTitle;
  }

  if (Array.isArray(data.steps) && data.steps.length > 0) {
    const grid = document.querySelector(".steps-grid");
    if (grid) {
      grid.innerHTML = data.steps
        .map(
          (step) => `
          <div class="step">
            <span class="step-num">${escapeHtml(step.stepNumber || "")}</span>
            <h3>${escapeHtml(pickLang(step.title, lang))}</h3>
            <p>${escapeHtml(pickLang(step.description, lang))}</p>
          </div>`,
        )
        .join("\n");
    }
  }
}

async function loadContact(lang) {
  const data = await fetchFromSanity(`
    *[_type == "contact" && _id == "contact"][0] {
      heading, subheading
    }
  `);
  if (!data) return;

  const heading = pickLang(data.heading, lang);
  if (heading) {
    const h2 = document.querySelector(".section-contact h2");
    if (h2) h2.textContent = heading;
  }

  const subheading = pickLang(data.subheading, lang);
  if (subheading) {
    const p = document.querySelector(".section-contact .container > p");
    if (p) p.textContent = subheading;
  }
}

// ── 8. INIT / PUBLIC API ──────────────────────────────────────────────────────

/**
 * Fetches and applies all site content for the given language. Exposed on
 * window so script.js's setLanguage() can call it when the user clicks a
 * language toggle.
 */
window.loadSanityContent = function loadSanityContent(lang) {
  if (!SANITY_PROJECT_ID || SANITY_PROJECT_ID === "your-project-id-here") {
    console.info(
      "[Sanity] No project ID set. Open sanity-content.js and set SANITY_PROJECT_ID.",
    );
    return Promise.resolve();
  }

  return Promise.all([
    loadSiteSettings(lang),
    loadHero(lang),
    loadAbout(lang),
    loadServices(lang),
    loadPricing(lang),
    loadStats(lang),
    loadPortfolio(lang),
    loadPhotography(lang),
    loadHowItWorks(lang),
    loadContact(lang),
  ]).catch((err) => {
    console.warn("[Sanity] Content load error:", err);
  });
};

function initSanityContent() {
  const lang =
    typeof window.getCurrentLang === "function" ? window.getCurrentLang() : "en";
  window.loadSanityContent(lang);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSanityContent);
} else {
  initSanityContent();
}
