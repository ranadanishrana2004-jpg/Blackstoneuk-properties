import type { MetadataRoute } from 'next';
import { safeProperties } from '@/lib/data';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

const PAGES = [
  '',
  '/properties',
  '/selling',
  '/refer-a-seller',
  '/landlords',
  '/halal-mortgages',
  '/valuation',
  '/stamp-duty',
  '/about',
  '/contact',
  '/privacy',
  '/cookies',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { items } = await safeProperties();
  return [
    ...PAGES.map((path) => ({
      url: base + path,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
    })),
    ...items
      .filter((p) => !p.sample)
      .map((p) => ({
        url: `${base}/properties/${p.slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
  ];
}
