import React from 'react';

/**
 * Search Apple for artwork and add the result as a list item.
 *
 * This is the interaction Keystatic cannot express: one control owns the whole
 * `items` array, so picking a search result fills name, artwork, credit and
 * link together. A per-field widget could only ever set its own value.
 *
 * Unlike the Sveltia version this may use hooks, because Tina bundles the
 * component through its own build and renders it with the same React instance.
 */

type Item = {
  name?: string;
  href?: string;
  image?: string;
  subtitle?: string;
  tags?: string[];
};

type Result = {
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
};

/**
 * The iTunes Search API sends no CORS header, so this goes through JSONP rather
 * than fetch. It is the same source `scripts/list-artwork.mjs` already uses for
 * `thumb: square` lists.
 */
function itunesSearch(term: string, entity: string): Promise<Result[]> {
  return new Promise((resolve, reject) => {
    const cb = `itunes_cb_${Math.floor(Math.random() * 1e9)}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('iTunes search timed out'));
    }, 10000);

    function cleanup() {
      clearTimeout(timer);
      delete (window as any)[cb];
      script.remove();
    }

    (window as any)[cb] = (data: { results?: Result[] }) => {
      cleanup();
      resolve(data.results ?? []);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('iTunes search failed'));
    };
    script.src =
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
      `&entity=${entity}&limit=8&callback=${cb}`;
    document.head.append(script);
  });
}

export const ArtworkList = (props: any) => {
  const items: Item[] = Array.isArray(props.input?.value)
    ? props.input.value
    : [];
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Result[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const entity = props.field?.entity ?? 'podcast';

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      setResults(await itunesSearch(query, entity));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const add = (r: Result) => {
    props.input.onChange([
      ...items,
      {
        name: r.collectionName ?? r.trackName,
        href: r.collectionViewUrl ?? r.trackViewUrl ?? '',
        image: r.artworkUrl600 ?? r.artworkUrl100 ?? '',
        subtitle: r.artistName ?? '',
        tags: [],
      },
    ]);
    setResults([]);
    setQuery('');
  };

  const remove = (i: number) => {
    const next = items.slice();
    next.splice(i, 1);
    props.input.onChange(next);
  };

  return (
    <div>
      <label className="block font-semibold text-sm mb-2">
        {props.field?.label ?? 'Items'}
      </label>

      <div className="flex gap-2 mb-3">
        <input
          value={query}
          placeholder="Search Apple by name…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <button
          type="button"
          onClick={search}
          disabled={busy}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {results.length > 0 && (
        <div className="mb-4 p-2 bg-gray-100 rounded grid gap-1">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => add(r)}
              className="flex gap-3 items-center p-2 bg-white border rounded text-left"
            >
              <img src={r.artworkUrl100} className="w-10 h-10 rounded" />
              <span className="flex flex-col">
                <strong className="text-sm">
                  {r.collectionName ?? r.trackName}
                </strong>
                <em className="text-xs opacity-70 not-italic">
                  {r.artistName}
                </em>
              </span>
            </button>
          ))}
        </div>
      )}

      <ul className="list-none m-0 p-0">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 items-center py-2 border-b">
            {item.image && (
              <img src={item.image} className="w-11 h-11 rounded-md" />
            )}
            <span className="flex flex-col flex-1">
              <strong className="text-sm">{item.name}</strong>
              {item.subtitle && (
                <em className="text-xs opacity-70 not-italic">
                  {item.subtitle}
                </em>
              )}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-red-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="text-sm opacity-60">No items yet.</p>
      )}
    </div>
  );
};
