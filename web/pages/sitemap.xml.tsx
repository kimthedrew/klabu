import { GetServerSideProps } from 'next';

const BASE_URL = 'https://klabu.site';

function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let stallIds: string[] = [];

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/stalls`);
    const data = await response.json();
    stallIds = (data.stalls ?? [])
      .map((s: any) => s.stall?.id)
      .filter(Boolean);
  } catch {
    // serve sitemap without stall pages if API is unreachable
  }

  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/reviews', changefreq: 'weekly', priority: '0.7' },
  ];

  const stallPages = stallIds.map((id) => ({
    loc: `/stall/${id}`,
    changefreq: 'daily',
    priority: '0.8',
  }));

  const allPages = [...staticPages, ...stallPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default Sitemap;
