import { z } from 'zod';
const profile = (domain: string) =>
  z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      if (!value) return true;
      try {
        const u = new URL(value);
        return (
          u.protocol === 'https:' &&
          !u.username &&
          !u.password &&
          (u.hostname === domain || u.hostname === 'www.' + domain) &&
          u.pathname !== '/'
        );
      } catch {
        return false;
      }
    }, 'Enter the full HTTPS profile URL, or leave this blank.');
export const socialLinksSchema = z.object({
  facebook: profile('facebook.com'),
  instagram: profile('instagram.com'),
});
export type SocialLinks = z.infer<typeof socialLinksSchema>;
export const emptySocialLinks: SocialLinks = { facebook: '', instagram: '' };
