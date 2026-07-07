export function getProxiedS3Url(originalUrl: string): string {
  if (!originalUrl) return originalUrl;
  try {
    const parsed = new URL(originalUrl);
    // If the URL points to the S3 bucket on port 9000, rewrite it to use the Next.js proxy
    if (parsed.port === '9000') {
      return `/s3${parsed.pathname}${parsed.search}`;
    }
  } catch (e) {
    // Return original url if parsing fails
  }
  return originalUrl;
}
