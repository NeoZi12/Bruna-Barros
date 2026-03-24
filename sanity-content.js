/**
 * sanity-content.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches all website content from Sanity's public CDN and updates the DOM.
 * Works without any build step — plain fetch() calls from a <script defer> tag.
 *
 * SECTIONS CONNECTED:
 *   ✅ Site Settings  — nav brand, email, social links, footer text
 *   ✅ Hero           — name, role, profile photo
 *   ✅ About          — heading, bio (rich text with bold/italic)
 *   ✅ Services       — section title + service cards
 *   ✅ Pricing        — section title, intro text, pricing packages
 *   ✅ Stats Bar      — all stat number/label pairs
 *   ✅ Portfolio      — section title + video phone mockups
 *   ✅ Photography    — section title + photo gallery
 *   ✅ How It Works   — section title + numbered process steps
 *   ✅ Contact        — heading, subheading
 *
 * FALLBACK:
 *   If Sanity returns no data for a section, the static HTML in index.html
 *   is left untouched. The site always renders correctly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. CONFIGURATION ──────────────────────────────────────────────────────────

const SANITY_PROJECT_ID = "u3pno5p8";
const SANITY_DATASET    = "production";
const SANITY_API_VERSION = "2024-01-01";

// ── 2. CORE FETCH HELPER ──────────────────────────────────────────────────────

/**
 * Sends a GROQ query to Sanity's public CDN and returns the result or null.
 * @param {string} query - GROQ query string
 * @returns {Promise<any|null>}
 */
async function fetchFromSanity(query) {
  const url =
    `https://${SANITY_PROJECT_ID}.api.sanity.io` +
    `/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}` +
    `?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Sanity] API error ${response.status}: ${response.statusText}`);
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

/**
 * Converts a Sanity image asset _ref to a CDN image URL.
 *
 * Input:  "image-Tb9Ew8CX-2000x3000-jpg"
 * Output: "https://cdn.sanity.io/images/projectId/dataset/Tb9Ew8CX-2000x3000.jpg"
 *
 * @param {string} ref   - The Sanity asset _ref string
 * @param {number} [width] - Optional max width (triggers auto-resizing)
 * @returns {string}
 */
function sanityImageUrl(ref, width) {
  const withoutPrefix = ref.replace(/^image-/, "");
  const parts         = withoutPrefix.split("-");
  const ext           = parts.pop();
  const filename      = parts.join("-");

  let url =
    `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}` +
    `/${filename}.${ext}`;

  if (width) url += `?w=${width}&auto=format&fit=crop`;
  return url;
}

/**
 * Converts a Sanity file asset _ref to a CDN file URL.
 *
 * Input:  "file-abc123def456-mp4"
 * Output: "https://cdn.sanity.io/files/projectId/dataset/abc123def456.mp4"
 *
 * @param {string} ref - The Sanity asset _ref string
 * @returns {string}
 */
function sanityFileUrl(ref) {
  const withoutPrefix = ref.replace(/^file-/, "");
  const parts         = withoutPrefix.split("-");
  const ext           = parts.pop();
  const id            = parts.join("-");

  return `https://cdn.sanity.io/files/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}.${ext}`;
}

// ── 4. PORTABLE TEXT RENDERER ─────────────────────────────────────────────────

/**
 * Converts Sanity Portable Text blocks to an HTML string.
 * Handles bold (strong) and italic (em) marks.
 *
 * @param {Array} blocks - Sanity Portable Text block array
 * @returns {string} HTML string
 */
function renderPortableText(blocks) {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .filter((block) => block._type === "block")
    .map((block) => {
      const innerHtml = (block.children || [])
        .map((span) => {
          let text = span.text || "";
          if (span.marks?.includes("strong")) text = `<strong>${text}</strong>`;
          if (span.marks?.includes("em"))     text = `<em>${text}</em>`;
          return text;
        })
        .join("");
      return `<p>${innerHtml}</p>`;
    })
    .join("\n");
}

// ── 5. HTML TEMPLATES ─────────────────────────────────────────────────────────

/**
 * Builds the inner HTML for a single pricing column.
 * @param {Object} pkg - Pricing package object from Sanity
 * @returns {string}
 */
function pricingColumnHtml(pkg) {
  const featuredClass = pkg.featured ? " pricing-col--featured" : "";
  const badge = pkg.featured
    ? `<span class="pricing-badge">${escapeHtml(pkg.badgeLabel || "★ Most Popular")}</span>`
    : "";

  const featureItems = (pkg.features || [])
    .map((f) => `<li>${escapeHtml(f)}</li>`)
    .join("\n              ");

  return `
          <div class="pricing-col${featuredClass}">
            <div class="pricing-inner">
              ${badge}
              <span class="pricing-name">${escapeHtml(pkg.name || "")}</span>
              <span class="pricing-price">${escapeHtml(pkg.priceLabel || "")}</span>
              <ul class="pricing-features">
              ${featureItems}
              </ul>
              <p class="pricing-target">${escapeHtml(pkg.targetDescription || "")}</p>
              <a href="#contact" class="pricing-cta">${escapeHtml(pkg.ctaLabel || "Get Started")}</a>
            </div>
          </div>`;
}

/**
 * Builds the HTML for a single portfolio item (phone mockup + video + label).
 * @param {Object} video - Portfolio video object from Sanity
 * @returns {string}
 */
function portfolioItemHtml(video) {
  const videoUrl  = video.videoFile?.asset?._ref
    ? sanityFileUrl(video.videoFile.asset._ref)
    : "";
  const posterUrl = video.posterImage?.asset?._ref
    ? sanityImageUrl(video.posterImage.asset._ref, 560)
    : "";
  const label = escapeHtml(video.label || "");

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

/** Escapes HTML special characters to prevent XSS. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 6. SECTION LOADERS ────────────────────────────────────────────────────────

/**
 * Site Settings — updates navbar brand, email links, social links, footer.
 * These values are shared across Hero, Contact, and the Footer.
 */
async function loadSiteSettings() {
  const s = await fetchFromSanity(`
    *[_type == "siteSettings" && _id == "siteSettings"][0] {
      brandName, email, instagramUrl, youtubeUrl, tiktokUrl, footerText
    }
  `);
  if (!s) return;

  // Navbar brand name
  if (s.brandName) {
    const brand = document.querySelector(".nav-brand");
    if (brand) brand.textContent = s.brandName;
  }

  // Hero email link
  if (s.email) {
    const heroEmail = document.querySelector(".hero-email");
    if (heroEmail) {
      heroEmail.href        = `mailto:${s.email}`;
      heroEmail.textContent = s.email;
    }
  }

  // Hero social links (3 anchors inside .hero-socials, order: Instagram · YouTube · TikTok)
  const heroSocials = document.querySelector(".hero-socials");
  if (heroSocials) {
    const links = heroSocials.querySelectorAll("a");
    const socials = [s.instagramUrl, s.youtubeUrl, s.tiktokUrl];
    links.forEach((a, i) => {
      if (socials[i]) a.href = socials[i];
    });
  }

  // Contact section email button
  if (s.email) {
    const contactBtn = document.querySelector(".section-contact .btn-outline");
    if (contactBtn) {
      contactBtn.href        = `mailto:${s.email}`;
      contactBtn.textContent = s.email;
    }
  }

  // Contact social links (order: Instagram, YouTube, TikTok)
  const contactSocials = document.querySelector(".contact-socials");
  if (contactSocials) {
    const links = contactSocials.querySelectorAll("a");
    const socials = [s.instagramUrl, s.youtubeUrl, s.tiktokUrl];
    links.forEach((a, i) => {
      if (socials[i]) a.href = socials[i];
    });
  }

  // Footer copyright text
  if (s.footerText) {
    const footer = document.querySelector(".footer p");
    if (footer) footer.textContent = s.footerText;
  }
}

/**
 * Hero Section — updates name heading, role subtitle, and profile photo.
 */
async function loadHero() {
  const hero = await fetchFromSanity(`
    *[_type == "hero" && _id == "hero"][0] {
      firstName,
      lastName,
      role,
      heroImage { asset { _ref } }
    }
  `);
  if (!hero) return;

  // Name (h1.hero-name)
  if (hero.firstName || hero.lastName) {
    const nameEl = document.querySelector(".hero-name");
    if (nameEl) {
      nameEl.innerHTML = `${hero.firstName || ""}<br>${hero.lastName || ""}`;
    }
  }

  // Role / subtitle (p.hero-subtitle) — preserve styled & if present
  if (hero.role) {
    const subtitleEl = document.querySelector(".hero-subtitle");
    if (subtitleEl) {
      if (hero.role.includes("&")) {
        const [before, after] = hero.role.split("&").map((s) => s.trim());
        subtitleEl.innerHTML = `${before} <span class="amp">&amp;</span> ${after}`;
      } else {
        subtitleEl.textContent = hero.role;
      }
    }
  }

  // Profile photo (.hero-portrait img)
  if (hero.heroImage?.asset?._ref) {
    const imgEl = document.querySelector(".hero-portrait img");
    if (imgEl) {
      imgEl.src = sanityImageUrl(hero.heroImage.asset._ref, 720);
      imgEl.alt = `${hero.firstName || ""} ${hero.lastName || ""}`.trim();
    }
  }
}

/**
 * About Section — updates heading and bio paragraphs (Portable Text).
 */
async function loadAbout() {
  const about = await fetchFromSanity(`
    *[_type == "about" && _id == "about"][0] {
      heading,
      body
    }
  `);
  if (!about) return;

  const textContainer = document.querySelector(".about-text");
  if (!textContainer) return;

  if (about.heading) {
    const h2 = textContainer.querySelector("h2");
    if (h2) h2.textContent = about.heading;
  }

  if (Array.isArray(about.body) && about.body.length > 0) {
    textContainer.querySelectorAll("p").forEach((p) => p.remove());
    textContainer.insertAdjacentHTML("beforeend", renderPortableText(about.body));
  }
}

/**
 * Services Section — updates the section title and rebuilds the service cards.
 */
async function loadServices() {
  const data = await fetchFromSanity(`
    *[_type == "services" && _id == "services"][0] {
      sectionTitle,
      items[] { title, description }
    }
  `);
  if (!data) return;

  if (data.sectionTitle) {
    const h2 = document.querySelector(".section-services h2");
    if (h2) h2.textContent = data.sectionTitle;
  }

  if (Array.isArray(data.items) && data.items.length > 0) {
    const grid = document.querySelector(".services-grid");
    if (grid) {
      grid.innerHTML = data.items
        .map(
          (item) => `
          <div class="service-card">
            <h3>${escapeHtml(item.title || "")}</h3>
            <p>${escapeHtml(item.description || "")}</p>
          </div>`,
        )
        .join("\n");
    }
  }
}

/**
 * Pricing Section — updates title, intro text, and rebuilds pricing columns.
 */
async function loadPricing() {
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

  if (data.sectionTitle) {
    const h2 = document.querySelector(".section-investment h2");
    if (h2) h2.textContent = data.sectionTitle;
  }

  if (data.introText) {
    const sub = document.querySelector(".investment-sub");
    if (sub) sub.textContent = data.introText;
  }

  if (Array.isArray(data.packages) && data.packages.length > 0) {
    const grid = document.querySelector(".pricing-grid");
    if (grid) {
      grid.innerHTML = data.packages.map(pricingColumnHtml).join("\n");
    }
  }
}

/**
 * Stats Bar — rebuilds the stat number/label pairs.
 */
async function loadStats() {
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
            <span class="stat-label">${escapeHtml(stat.label || "")}</span>
          </div>`,
    )
    .join("\n");
}

/**
 * Portfolio — rebuilds the phone mockup video items.
 * After rebuilding, re-initialises the viewport-based auto-pause/resume
 * observer defined in script.js.
 */
async function loadPortfolio() {
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

  if (data.sectionTitle) {
    const h2 = document.querySelector(".section-portfolio h2");
    if (h2) h2.textContent = data.sectionTitle;
  }

  if (Array.isArray(data.videos) && data.videos.length > 0) {
    const grid = document.querySelector(".portfolio-grid");
    if (grid) {
      grid.innerHTML = data.videos.map(portfolioItemHtml).join("\n");

      // Re-attach the viewport observer from script.js so the new
      // phone elements get the auto-pause/resume behaviour.
      if (typeof window.observePortfolioPhones === "function") {
        window.observePortfolioPhones();
      }
    }
  }
}

/**
 * Photography Gallery — updates the section title and rebuilds the photo grid.
 */
async function loadPhotography() {
  const data = await fetchFromSanity(`
    *[_type == "photography" && _id == "photography"][0] {
      sectionTitle,
      photos[] { alt, asset { _ref } }
    }
  `);
  if (!data) return;

  if (data.sectionTitle) {
    const h2 = document.querySelector(".section-photography h2");
    if (h2) h2.textContent = data.sectionTitle;
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
              alt="${escapeHtml(p.alt || "")}"
            />
          </div>`,
        )
        .join("\n");
    }
  }
}

/**
 * How It Works — updates the section title and rebuilds the process steps.
 */
async function loadHowItWorks() {
  const data = await fetchFromSanity(`
    *[_type == "howItWorks" && _id == "howItWorks"][0] {
      sectionTitle,
      steps[] { stepNumber, title, description }
    }
  `);
  if (!data) return;

  if (data.sectionTitle) {
    const h2 = document.querySelector(".section-how h2");
    if (h2) h2.textContent = data.sectionTitle;
  }

  if (Array.isArray(data.steps) && data.steps.length > 0) {
    const grid = document.querySelector(".steps-grid");
    if (grid) {
      grid.innerHTML = data.steps
        .map(
          (step) => `
          <div class="step">
            <span class="step-num">${escapeHtml(step.stepNumber || "")}</span>
            <h3>${escapeHtml(step.title || "")}</h3>
            <p>${escapeHtml(step.description || "")}</p>
          </div>`,
        )
        .join("\n");
    }
  }
}

/**
 * Contact Section — updates the heading and subheading.
 * Email and social links are handled by loadSiteSettings().
 */
async function loadContact() {
  const data = await fetchFromSanity(`
    *[_type == "contact" && _id == "contact"][0] {
      heading, subheading
    }
  `);
  if (!data) return;

  if (data.heading) {
    const h2 = document.querySelector(".section-contact h2");
    if (h2) h2.textContent = data.heading;
  }

  if (data.subheading) {
    // Target the <p> that is a direct child of .container inside .section-contact
    const p = document.querySelector(".section-contact .container > p");
    if (p) p.textContent = data.subheading;
  }
}

// ── 7. INIT ────────────────────────────────────────────────────────────────────

/**
 * Entry point — runs all section loaders in parallel once the DOM is ready.
 * All loaders are independent and safe to run concurrently.
 */
function initSanityContent() {
  if (!SANITY_PROJECT_ID || SANITY_PROJECT_ID === "your-project-id-here") {
    console.info(
      "[Sanity] No project ID set. Open sanity-content.js and set SANITY_PROJECT_ID.",
    );
    return;
  }

  Promise.all([
    loadSiteSettings(),
    loadHero(),
    loadAbout(),
    loadServices(),
    loadPricing(),
    loadStats(),
    loadPortfolio(),
    loadPhotography(),
    loadHowItWorks(),
    loadContact(),
  ]).catch((err) => {
    console.warn("[Sanity] Content load error:", err);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSanityContent);
} else {
  initSanityContent();
}
