import Head from 'next/head';

const SITE_NAME = 'Klabu';
const BASE_URL = 'https://klabu.site';
const DEFAULT_DESCRIPTION =
  'Klabu — UON food delivery. Order food from stalls at the University of Nairobi and get it delivered straight to your hostel room.';
const KEYWORDS =
  'klabu, klabu uon, uon food, uon food delivery, university of nairobi food, university of nairobi food delivery, klabu food delivery, uon hostel food delivery, order food uon, klabu stalls, food delivery university of nairobi, nairobi university hostel food, klabu nairobi, uon campus food, university of nairobi hostel delivery';

interface SEOProps {
  title?: string;
  description?: string;
  canonical: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}

export default function SEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Food Delivery at UON`;
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = `${BASE_URL}${canonical}`;
  const ogImageUrl = ogImage ||
    `${BASE_URL}/api/og?title=${encodeURIComponent(fullTitle)}&description=${encodeURIComponent(metaDescription)}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={KEYWORDS} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="google-site-verification" content="5oh__3S883up8kyztybo4IPOvlJBq72Nl6K8fhA3lio" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content="en_KE" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* JSON-LD Structured Data */}
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
}
