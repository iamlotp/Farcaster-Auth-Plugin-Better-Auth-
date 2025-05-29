/**
    To Verify A Farcaster SignIn Message The Domain Name For Your App
    Should Be Sent To Farcaster Verification Relay.
    (If No Domain Provided Defaults To localhost:3000)
*/
export function getDomainFromUrl(urlString: string | undefined): string {
  if (!urlString) {
    console.warn('BETTER_AUTH_URL is not set, using localhost:3000 as fallback');
    return 'localhost:3000';
  }
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch (error) {
    console.error('Invalid BETTER_AUTH_URL:', urlString, error);
    console.warn('Using localhost:3000 as fallback');
    return 'localhost:3000';
  }
}