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
   * Other credits this result could carry, broadest last.
   *
   * A place sits inside several areas at once, and which one belongs under the
   * name is a judgement: "Williamsburg" on a coffee list, "Brooklyn" on a list
   * that spans boroughs. The editor picks; nothing here guesses well enough to
   * decide.
   */
  subtitleOptions?: string[];
  /**
   * Opaque handles for pictures that each need a second request to resolve,
   * which is how Google hands out place photos. Sources that return a usable
   * `imageUrl` outright leave this alone.
   */
  photoRefs?: string[];
  /** Used to ask another source for a better neighbourhood. */
  address?: string;
};

export type ArtworkSource = {
  id: string;
  label: string;
  placeholder: string;
  /** Absent images are fine: filling in name, link and credit is most of the work. */
  providesArtwork: boolean;
  search(term: string): Promise<ArtworkResult[]>;
  /**
   * Optional second step for sources that offer several pictures per result.
   *
   * Called only for the one result the editor picks, never for the whole
   * search: Google charges per photo resolved, and a search of eight places
   * with ten photos each would be eighty requests to show a grid nobody asked
   * for.
   */
  listImages?(result: ArtworkResult): Promise<string[]>;
  /**
   * Optional second step for the credit line, for the same reason as the
   * images: it costs a request, so it runs for the one result picked rather
   * than for a whole search.
   */
  listCredits?(result: ArtworkResult): Promise<string[]>;
};

/**
 * The fields this file reads off an iTunes result, all optional because which
 * ones come back depends on the entity searched: an album has a
 * `collectionName`, a film has a `trackName`, and neither promises artwork.
 */
type ItunesResult = {
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  releaseDate?: string;
};

/** The window a JSONP callback is hung off, which is not in the DOM types. */
type JsonpWindow = Record<string, unknown>;

/**
 * The iTunes Search API sends no CORS header, so requests go through JSONP.
 * Its artwork CDN does send one, which is what lets the browser upload the
 * image without a proxy.
 */
function itunesSearch(term: string, entity: string): Promise<ItunesResult[]> {
  return new Promise((resolve, reject) => {
    const callback = `itunes_cb_${Math.floor(Math.random() * 1e9)}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Search timed out'));
    }, 10000);

    function cleanup() {
      clearTimeout(timer);
      delete (window as unknown as JsonpWindow)[callback];
      script.remove();
    }

    (window as unknown as JsonpWindow)[callback] = (data: {
      results?: ItunesResult[];
    }) => {
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

/**
 * What to show an editor when a source throws.
 *
 * `catch` binds `unknown`, because anything can be thrown, and every source
 * above throws an `Error` with a sentence written for this purpose. The
 * fallback is for the one that gets thrown by a library instead.
 */
export function sourceErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Drops results the provider named nothing.
 *
 * A picker row *is* its name, so one without renders as a blank line, and
 * choosing it writes an item with no name. Every field a provider returns is
 * optional; this is what makes `ArtworkResult.name` the `string` it claims.
 */
function named<T extends { name?: string }>(
  results: T[]
): (T & { name: string })[] {
  return results.filter((r): r is T & { name: string } => !!r.name);
}

const podcasts: ArtworkSource = {
  id: 'podcasts',
  label: 'Apple Podcasts',
  placeholder: 'Search for a podcast…',
  providesArtwork: true,
  search: async (term) =>
    named(
      (await itunesSearch(term, 'podcast')).map((r) => ({
        name: r.collectionName ?? r.trackName,
        subtitle: r.artistName,
        href: r.collectionViewUrl ?? r.trackViewUrl,
        imageUrl: r.artworkUrl600 ?? r.artworkUrl100,
        hint: r.artistName,
      }))
    ),
};

const albums: ArtworkSource = {
  id: 'albums',
  label: 'Apple Music',
  placeholder: 'Search for an album…',
  providesArtwork: true,
  search: async (term) =>
    named(
      (await itunesSearch(term, 'album')).map((r) => ({
        name: r.collectionName,
        subtitle: r.artistName,
        href: r.collectionViewUrl,
        imageUrl: r.artworkUrl600 ?? r.artworkUrl100,
        hint: r.artistName,
      }))
    ),
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
    named(
      (await itunesSearch(term, 'movie')).map((r) => ({
        name: r.trackName,
        subtitle: r.releaseDate?.slice(0, 4),
        href: r.trackViewUrl,
        imageUrl: r.artworkUrl600 ?? r.artworkUrl100,
        hint: r.releaseDate?.slice(0, 4),
      }))
    ),
};

/**
 * The fields asked for in the Google `X-Goog-FieldMask` below, and no others.
 * Every one is optional: the mask says what to return if present, not what the
 * place has, and a venue with no website or no photographs is ordinary.
 */
type GooglePlace = {
  displayName?: { text?: string };
  websiteUri?: string;
  googleMapsUri?: string;
  shortFormattedAddress?: string;
  primaryTypeDisplayName?: { text?: string };
  addressComponents?: { types?: string[]; longText?: string }[];
  photos?: { name: string }[];
};

/**
 * Places from Google, which is the same set of venues but with photographs.
 *
 * Needs `PUBLIC_SANITY_GOOGLE_MAPS_KEY`. Anything prefixed `PUBLIC_` is
 * compiled into the browser bundle, so that key is readable by anyone who opens
 * the page: restrict it by HTTP referrer in Google Cloud, to localhost and the
 * deployed site, or it can be spent by strangers.
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
    const key = import.meta.env.PUBLIC_SANITY_GOOGLE_MAPS_KEY;
    if (!key) {
      throw new Error(
        'Set PUBLIC_SANITY_GOOGLE_MAPS_KEY in .env, then restart the dev server'
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
            'places.shortFormattedAddress',
            'places.primaryTypeDisplayName',
            'places.photos',
          ].join(','),
        },
        body: JSON.stringify({ textQuery: term, maxResultCount: 8 }),
      }
    );

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(
        detail?.error?.message ?? `Place search failed (${response.status})`
      );
    }

    const { places: found = [] }: { places?: GooglePlace[] } =
      await response.json();

    return named(
      found.map((place) => {
        /*
         * "Williamsburg" identifies a coffee shop to a reader; "Manhattan" does
         * not. Ordered rather than matched against a set, because a place often
         * carries several of these and the first match wins: a set would let the
         * borough beat the neighbourhood whenever Google listed it first.
         */
        const component = (type: string) =>
          (place.addressComponents ?? []).find((c) => c.types?.includes(type))
            ?.longText;

        // Narrowest first, which is the usual preference, but all of them are
        // offered because Google carries no neighbourhood for many Manhattan
        // addresses and the right answer is then a borough or a typed word.
        const areas = [
          component('neighborhood'),
          component('sublocality_level_1'),
          component('locality'),
          component('administrative_area_level_2'),
        ].filter(
          (value, i, all) => value && all.indexOf(value) === i
        ) as string[];

        return {
          name: place.displayName?.text,
          subtitle: areas[0],
          subtitleOptions: areas,
          address: place.shortFormattedAddress,
          href: place.websiteUri ?? place.googleMapsUri,
          photoRefs: (place.photos ?? []).map((photo) => photo.name),
          /*
           * The street address, not the area, because a search for a chain
           * returns several branches in one neighbourhood and the area alone
           * cannot tell them apart. The area is still what the site shows: it
           * reads better as a credit than a street number does.
           */
          hint: [
            place.primaryTypeDisplayName?.text,
            place.shortFormattedAddress,
          ]
            .filter(Boolean)
            .join(' · '),
        };
      })
    );
  },

  /**
   * Resolves photo references into URLs the browser is allowed to read.
   *
   * Capped at eight. A busy restaurant can carry dozens, each costing a
   * request, and a grid longer than that is a worse way to choose rather than
   * a better one.
   */

  /**
   * Credit options, with OpenStreetMap filling Google's gap.
   *
   * Google carries no `neighborhood` component for much of Manhattan: 25 E
   * 20th St stops at "Manhattan", and a coffee list wants "Flatiron District".
   * OpenStreetMap has it, needs no key, and is asked once for the one place
   * chosen. Its answer leads because it is the most specific; Google's own
   * areas follow as the fallback.
   */
  listCredits: async (result) => {
    const google = result.subtitleOptions ?? [];
    if (!result.address) return google;

    try {
      const params = new URLSearchParams({
        q: result.address,
        format: 'jsonv2',
        limit: '1',
        addressdetails: '1',
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`
      );
      if (!response.ok) return google;

      const [match] = await response.json();
      const address = match?.address ?? {};
      const osm = [
        address.neighbourhood,
        address.quarter,
        address.suburb,
        address.city_district,
      ].filter(Boolean) as string[];

      return [...osm, ...google].filter(
        (value, i, all) => all.indexOf(value) === i
      );
    } catch {
      return google;
    }
  },

  listImages: async (result) => {
    const key = import.meta.env.PUBLIC_SANITY_GOOGLE_MAPS_KEY;

    /*
     * The venue's own logo first, then its photographs.
     *
     * A logo on white is the better thumbnail for a business, and Google never
     * returns one. It comes from the venue's website instead, read by the dev
     * server because the studio is not allowed to read another site's HTML.
     * Absent that server, or for a place with no website, this contributes
     * nothing and the photographs stand alone.
     */
    /*
     * Logos come from the venue's own site, read by the dev server.
     *
     * A "<name> logo" image search would rank better, and was built, but
     * Google discontinued full-web search for new Programmable Search Engines
     * in August 2025: an engine created now can only search sites you list,
     * which cannot find a logo for an arbitrary business. The code was removed
     * rather than left looking configurable.
     */
    const logos = result.href?.startsWith('http')
      ? await fetch(
          `http://localhost:4321/_logo?site=${encodeURIComponent(result.href)}`
        )
          .then((r) => r.json())
          .then((d) => d.logos as string[])
          .catch(() => [])
      : [];

    if (!key || !result.photoRefs?.length) return logos;

    const urls = await Promise.all(
      result.photoRefs.slice(0, 8).map(async (ref) => {
        const response = await fetch(
          `https://places.googleapis.com/v1/${ref}/media` +
            `?maxWidthPx=1200&skipHttpRedirect=true&key=${key}`
        );
        if (!response.ok) return undefined;
        return (await response.json()).photoUri as string;
      })
    );
    return [...logos, ...(urls.filter(Boolean) as string[])];
  },
};

/**
 * A Nominatim result. `address` and `extratags` arrive because the search asks
 * for them; which keys they carry varies by country and by how the place was
 * mapped, so every one is read defensively.
 */
type NominatimPlace = {
  name?: string;
  display_name?: string;
  type?: string;
  address?: Record<string, string | undefined>;
  extratags?: Record<string, string | undefined>;
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
    if (!response.ok)
      throw new Error(`Place search failed (${response.status})`);

    const found: NominatimPlace[] = await response.json();

    return named(
      found.map((place) => {
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
          hint: [place.type?.replace(/_/g, ' '), area]
            .filter(Boolean)
            .join(' · '),
        };
      })
    );
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

/**
 * Keyed by each source's own `id`, never by its variable name.
 *
 * Written by hand, those two drifted: `googlePlaces` was stored under that
 * name while the schema saved `google-places`, so the lookup missed and every
 * Google list silently fell back to having no search at all. Deriving the key
 * makes the mistake impossible to repeat.
 */
export const SOURCES: Record<string, ArtworkSource> = Object.fromEntries(
  [podcasts, films, albums, googlePlaces, places, manual].map((source) => [
    source.id,
    source,
  ])
);

export const SOURCE_OPTIONS = Object.values(SOURCES).map((s) => ({
  title: s.label,
  value: s.id,
}));
