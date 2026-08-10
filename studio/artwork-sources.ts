/**
 * Where a list's items come from.
 *
 * Each list names a source, and each source knows how to turn a search term
 * into candidate items. Adding a kind of list -- coffee shops, books, records
 * -- is writing one `search` function and adding it to `SOURCES`, not touching
 * the input component.
 *
 * Source is deliberately separate from `thumb`. The ratio says how an item
 * looks; the source says where its data comes from. Coffee shops are square
 * like podcasts and share nothing else.
 */

/** One candidate, normalised so the input never learns a provider's shape. */
export type ArtworkResult = {
  name: string;
  /** The credit line: a podcast's hosts, a film's year, a shop's neighborhood. */
  subtitle?: string;
  href?: string;
  /**
   * Must be fetchable cross-origin, because the browser downloads it and
   * uploads it to Sanity. A provider whose images are not CORS-readable should
   * leave this out rather than return a URL that fails at upload time.
   */
  imageUrl?: string;
  /** Shown in the result row, where it helps tell two matches apart. */
  hint?: string;
  /**
   * An opaque handle for a picture that needs a second request to resolve,
   * which is how Google hands out place photos. Sources that return a usable
   * `imageUrl` outright leave this alone.
   */
  photoRef?: string;
};

export type ArtworkSource = {
  id: string;
  label: string;
  placeholder: string;
  /** Absent images are fine: filling in name, link and credit is most of the work. */
  providesArtwork: boolean;
  search(term: string): Promise<ArtworkResult[]>;
  /**
   * Optional second step for sources whose search results only point at a
   * picture. Called just before upload, so a list of ten results costs one
   * request rather than ten.
   */
  resolveImage?(result: ArtworkResult): Promise<string | undefined>;
};

/**
 * The iTunes Search API sends no CORS header, so requests go through JSONP.
 * Its artwork CDN does send one, which is what lets the browser upload the
 * image without a proxy.
 */
function itunesSearch(term: string, entity: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const callback = `itunes_cb_${Math.floor(Math.random() * 1e9)}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Search timed out'));
    }, 10000);

    function cleanup() {
      clearTimeout(timer);
      delete (window as any)[callback];
      script.remove();
    }

    (window as any)[callback] = (data: { results?: any[] }) => {
      cleanup();
      resolve(data.results ?? []);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Search failed'));
    };
    script.src =
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
      `&entity=${entity}&limit=8&callback=${callback}`;
    document.head.append(script);
  });
}

const podcasts: ArtworkSource = {
  id: 'podcasts',
  label: 'Apple Podcasts',
  placeholder: 'Search for a podcast…',
  providesArtwork: true,
  search: async (term) =>
    (await itunesSearch(term, 'podcast')).map((r) => ({
      name: r.collectionName ?? r.trackName,
      subtitle: r.artistName,
      href: r.collectionViewUrl ?? r.trackViewUrl,
      imageUrl: r.artworkUrl600 ?? r.artworkUrl100,
      hint: r.artistName,
    })),
};

const albums: ArtworkSource = {
  id: 'albums',
  label: 'Apple Music',
  placeholder: 'Search for an album…',
  providesArtwork: true,
  search: async (term) =>
    (await itunesSearch(term, 'album')).map((r) => ({
      name: r.collectionName,
      subtitle: r.artistName,
      href: r.collectionViewUrl,
      imageUrl: r.artworkUrl600 ?? r.artworkUrl100,
      hint: r.artistName,
    })),
};

/**
 * Films from Apple, kept because it needs no key.
 *
 * `scripts/list-artwork.mjs` records that Apple's film storefront returned
 * nothing as of 2026 and that TMDB was used instead. If this comes back empty,
 * that is the known reason, and TMDB is the replacement -- at the cost of a key
 * that would sit in the studio bundle where anyone can read it.
 */
const films: ArtworkSource = {
  id: 'films',
  label: 'Apple TV',
  placeholder: 'Search for a film…',
  providesArtwork: true,
  search: async (term) =>
    (await itunesSearch(term, 'movie')).map((r) => ({
      name: r.trackName,
      subtitle: r.releaseDate?.slice(0, 4),
      href: r.trackViewUrl,
      imageUrl: r.artworkUrl600 ?? r.artworkUrl100,
      hint: r.releaseDate?.slice(0, 4),
    })),
};

/**
 * Places from Google, which is the same set of venues but with photographs.
 *
 * Needs `SANITY_STUDIO_GOOGLE_MAPS_KEY`. Anything prefixed `SANITY_STUDIO_` is
 * compiled into the studio bundle, so that key is readable by anyone who opens
 * the page: restrict it by HTTP referrer in Google Cloud, to localhost and the
 * deployed studio host, or it can be spent by strangers.
 *
 * Two requests per photo, not one. The media endpoint answers with a redirect
 * to googleusercontent, and `skipHttpRedirect` turns that into a JSON body
 * naming the real URL, which is steadier than asking fetch to follow a
 * cross-origin redirect and hope the final host allows the read. It does allow
 * it -- `lh3.googleusercontent.com` returns `access-control-allow-origin: *`,
 * which is what makes uploading a place photo possible at all.
 */
const googlePlaces: ArtworkSource = {
  id: 'google-places',
  label: 'Places (Google)',
  placeholder: 'Search a shop, bar or restaurant…',
  providesArtwork: true,
  search: async (term) => {
    const key = process.env.SANITY_STUDIO_GOOGLE_MAPS_KEY;
    if (!key) {
      throw new Error(
        'Set SANITY_STUDIO_GOOGLE_MAPS_KEY in .env, then restart the studio'
      );
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': [
            'places.displayName',
            'places.websiteUri',
            'places.googleMapsUri',
            'places.addressComponents',
            'places.primaryTypeDisplayName',
            'places.photos',
          ].join(','),
        },
        body: JSON.stringify({ textQuery: term, maxResultCount: 8 }),
      }
    );

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(detail?.error?.message ?? `Place search failed (${response.status})`);
    }

    const { places: found = [] } = await response.json();

    return found.map((place: any) => {
      // "Williamsburg" identifies a coffee shop to a reader; the borough does
      // not, and the full formatted address is too long for a credit line.
      const area = (place.addressComponents ?? []).find((c: any) =>
        c.types?.some((t: string) =>
          ['neighborhood', 'sublocality', 'locality'].includes(t)
        )
      )?.longText;

      return {
        name: place.displayName?.text,
        subtitle: area,
        href: place.websiteUri ?? place.googleMapsUri,
        photoRef: place.photos?.[0]?.name,
        hint: [place.primaryTypeDisplayName?.text, area].filter(Boolean).join(' · '),
      };
    });
  },

  /** Resolves a photo reference into a URL the browser is allowed to read. */
  resolveImage: async (result) => {
    const key = process.env.SANITY_STUDIO_GOOGLE_MAPS_KEY;
    if (!key || !result.photoRef) return undefined;

    const response = await fetch(
      `https://places.googleapis.com/v1/${result.photoRef}/media` +
        `?maxWidthPx=1200&skipHttpRedirect=true&key=${key}`
    );
    if (!response.ok) return undefined;
    return (await response.json()).photoUri;
  },
};

/**
 * The same venues without a key, an account or a card.
 *
 * Kept beside the Google source as the fallback: it returns no photograph, but
 * it needs nothing to run and is not subject to anyone's terms about storing
 * their pictures. Foursquare is absent from both because its current API
 * refuses cross-origin requests outright, its preflight answering 400, leaving
 * only a legacy version they are migrating off.
 *
 * Nominatim's usage policy caps callers at one request a second and asks them
 * to identify themselves. A human clicking Search cannot outrun that, and a
 * browser sends a Referer, which is the identification the policy accepts from
 * a web app.
 */
const places: ArtworkSource = {
  id: 'places',
  label: 'Places (OpenStreetMap, no key)',
  placeholder: 'Search a shop, bar or restaurant…',
  providesArtwork: false,
  search: async (term) => {
    const params = new URLSearchParams({
      q: term,
      format: 'jsonv2',
      limit: '8',
      addressdetails: '1',
      extratags: '1',
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`
    );
    if (!response.ok) throw new Error(`Place search failed (${response.status})`);

    return (await response.json()).map((place: any) => {
      const address = place.address ?? {};
      const extra = place.extratags ?? {};
      // Neighborhood first: "Williamsburg" identifies a coffee shop to a
      // reader in a way "Kings County" does not.
      const area =
        address.neighbourhood ??
        address.suburb ??
        address.town ??
        address.city ??
        address.state;

      return {
        name: place.name || place.display_name?.split(',')[0],
        subtitle: area,
        href: extra.website ?? extra['contact:website'],
        hint: [place.type?.replace(/_/g, ' '), area].filter(Boolean).join(' · '),
      };
    });
  },
};

/**
 * For lists with no catalogue behind them at all.
 *
 * Adding the item by hand is still less work than the alternative, and the
 * upload field on each item is where its photo goes. This exists so a list can
 * say "there is no source" rather than being pointed at the wrong one.
 */
const manual: ArtworkSource = {
  id: 'manual',
  label: 'None (add by hand)',
  placeholder: '',
  providesArtwork: false,
  search: async () => [],
};

export const SOURCES: Record<string, ArtworkSource> = {
  podcasts,
  films,
  albums,
  places,
  manual,
};

export const SOURCE_OPTIONS = Object.values(SOURCES).map((s) => ({
  title: s.label,
  value: s.id,
}));
