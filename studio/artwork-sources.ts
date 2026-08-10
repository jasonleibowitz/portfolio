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
};

export type ArtworkSource = {
  id: string;
  label: string;
  placeholder: string;
  /** Absent images are fine: filling in name, link and credit is most of the work. */
  providesArtwork: boolean;
  search(term: string): Promise<ArtworkResult[]>;
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
 * For lists with no catalogue behind them, which is most of the interesting
 * ones: coffee shops, restaurants, walks.
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
  manual,
};

export const SOURCE_OPTIONS = Object.values(SOURCES).map((s) => ({
  title: s.label,
  value: s.id,
}));
