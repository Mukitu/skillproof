


export const INVALID_YOUTUBE_VIDEO_ID = '';

const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
];


export function parseYouTubeVideoId(rawUrl: string | null | undefined): string {
  if (!rawUrl) return INVALID_YOUTUBE_VIDEO_ID;
  const trimmed = rawUrl.trim();
  if (!trimmed) return INVALID_YOUTUBE_VIDEO_ID;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    
    
    try {
      url = new URL(`https://${trimmed}`);
    } catch {
      return INVALID_YOUTUBE_VIDEO_ID;
    }
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return INVALID_YOUTUBE_VIDEO_ID;
  }

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    return isLikelyVideoId(id) ? id : INVALID_YOUTUBE_VIDEO_ID;
  }

  if (url.pathname === '/watch' || url.pathname === '/watch/') {
    const id = url.searchParams.get('v') || url.searchParams.get('vi');
    return isLikelyVideoId(id) ? (id as string) : INVALID_YOUTUBE_VIDEO_ID;
  }

  
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const [first, second] = segments;
    if (first === 'shorts' || first === 'embed' || first === 'v' || first === 'live') {
      return isLikelyVideoId(second) ? second : INVALID_YOUTUBE_VIDEO_ID;
    }
  }

  return INVALID_YOUTUBE_VIDEO_ID;
}


export function buildYouTubeEmbedUrl(rawUrl: string | null | undefined): string | null {
  const id = parseYouTubeVideoId(rawUrl);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
    cc_load_policy: '0',
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
}


function isLikelyVideoId(value: string | null | undefined): boolean {
  if (!value) return false;
  
  const cleaned = value.trim();
  if (!cleaned) return false;
  return /^[A-Za-z0-9_-]{6,15}$/.test(cleaned);
}