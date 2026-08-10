import { Box, Button, Card, Flex, Spinner, Stack, Text, TextInput } from '@sanity/ui';
import { useCallback, useState } from 'react';
import { insert, useClient, useFormValue, type ArrayOfObjectsInputProps } from 'sanity';

/**
 * Adds a "search and add" row above a list's items.
 *
 * This is the thing the whole CMS choice turned on: adding a podcast should be
 * typing its name, not typing a name, finding artwork, downloading it,
 * converting it, and pasting a path. Keystatic could not host this at all, and
 * it is why `scripts/list-artwork.mjs` exists as a separate command today.
 *
 * The default array input is still rendered underneath, so drag-to-reorder,
 * editing an item and moving one between groups all keep working. This only
 * adds a way in.
 */

type Result = {
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  releaseDate?: string;
};

/**
 * The iTunes Search API sends no CORS header, so this goes through JSONP.
 * Its artwork CDN does send one, which is what makes the upload below possible
 * without a proxy.
 */
function itunesSearch(term: string, entity: string): Promise<Result[]> {
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

    (window as any)[callback] = (data: { results?: Result[] }) => {
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

const randomKey = () => Math.random().toString(36).slice(2, 10);

export function ArtworkInput(props: ArrayOfObjectsInputProps) {
  const { onChange, renderDefault } = props;
  const client = useClient({ apiVersion: '2025-08-15' });

  // The list's own ratio picks the search source, so a poster list searches
  // films and a square list searches podcasts without a second control.
  const thumb = useFormValue(['thumb']) as string | undefined;
  const entity = thumb === 'poster' ? 'movie' : 'podcast';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
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
  }, [query, entity]);

  /**
   * Uploads the artwork and appends the item.
   *
   * The image becomes a real Sanity asset rather than a link to Apple's CDN:
   * a remote URL would put every list at the mercy of someone else's server,
   * which is the reason the file-backed schema refused remote images too.
   */
  const add = useCallback(
    async (result: Result) => {
      const name = result.collectionName ?? result.trackName ?? '';
      setAdding(name);
      setError(null);
      try {
        const source = result.artworkUrl600 ?? result.artworkUrl100;
        let image;

        if (source) {
          const blob = await fetch(source).then((r) => {
            if (!r.ok) throw new Error(`Artwork fetch failed (${r.status})`);
            return r.blob();
          });
          const asset = await client.assets.upload('image', blob, {
            filename: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`,
          });
          image = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
        }

        onChange(
          insert(
            [
              {
                _type: 'listItem',
                _key: randomKey(),
                name,
                href: result.collectionViewUrl ?? result.trackViewUrl,
                subtitle: result.artistName,
                tags: [],
                ...(image ? { image } : {}),
              },
            ],
            'after',
            [-1]
          )
        );
        setResults([]);
        setQuery('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setAdding(null);
      }
    },
    [client, onChange]
  );

  return (
    <Stack space={3}>
      <Card padding={3} radius={2} tone="primary" border>
        <Stack space={3}>
          <Text size={1} weight="medium">
            Add from Apple ({entity === 'movie' ? 'films' : 'podcasts'})
          </Text>

          <Flex gap={2}>
            <Box flex={1}>
              <TextInput
                value={query}
                placeholder={`Search for a ${entity}…`}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    search();
                  }
                }}
              />
            </Box>
            <Button
              text={busy ? 'Searching…' : 'Search'}
              disabled={busy}
              onClick={search}
              mode="default"
            />
          </Flex>

          {error && (
            <Text size={1} style={{ color: 'var(--card-fg-color)' }}>
              {error}
            </Text>
          )}

          {results.length > 0 && (
            <Stack space={2}>
              {results.map((result, i) => {
                const name = result.collectionName ?? result.trackName ?? '';
                return (
                  <Card
                    key={i}
                    padding={2}
                    radius={2}
                    border
                    as="button"
                    onClick={() => add(result)}
                    disabled={adding !== null}
                    style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <Flex align="center" gap={3}>
                      <img
                        src={result.artworkUrl100}
                        alt=""
                        width={40}
                        height={40}
                        style={{ borderRadius: 4, flexShrink: 0 }}
                      />
                      <Stack space={2} flex={1}>
                        <Text size={1} weight="medium">
                          {name}
                        </Text>
                        <Text size={0} muted>
                          {result.artistName}
                        </Text>
                      </Stack>
                      {adding === name && <Spinner muted />}
                    </Flex>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Card>

      {renderDefault(props)}
    </Stack>
  );
}
