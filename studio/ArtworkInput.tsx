import { Box, Button, Card, Flex, Spinner, Stack, Text, TextInput } from '@sanity/ui';
import { useCallback, useState } from 'react';
import { insert, useClient, useFormValue, type ArrayOfObjectsInputProps } from 'sanity';

import { SOURCES, type ArtworkResult } from './artwork-sources';

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

const randomKey = () => Math.random().toString(36).slice(2, 10);

export function ArtworkInput(props: ArrayOfObjectsInputProps) {
  const { onChange, renderDefault } = props;
  const client = useClient({ apiVersion: '2025-08-15' });

  /*
   * The list says where its items come from. Reading `thumb` instead, as this
   * did at first, conflates how an item looks with where its data lives: a
   * coffee shop is square like a podcast and shares nothing else with one.
   */
  const sourceId = (useFormValue(['source']) as string | undefined) ?? 'manual';
  const source = SOURCES[sourceId] ?? SOURCES.manual;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArtworkResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      setResults(await source.search(query));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [query, source]);

  /**
   * Uploads the artwork and appends the item.
   *
   * The image becomes a real Sanity asset rather than a link to Apple's CDN:
   * a remote URL would put every list at the mercy of someone else's server,
   * which is the reason the file-backed schema refused remote images too.
   */
  const add = useCallback(
    async (result: ArtworkResult) => {
      const name = result.name;
      setAdding(name);
      setError(null);
      try {
        // Google hands out a photo reference rather than a URL, so the second
        // request happens here, once, for the one result actually chosen.
        const artwork =
          result.imageUrl ?? (await source.resolveImage?.(result));
        let image;

        if (artwork) {
          const blob = await fetch(artwork).then((r) => {
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
                href: result.href,
                subtitle: result.subtitle,
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
    [client, onChange, source]
  );

  // A list with no catalogue behind it gets the plain array editor, with no
  // search box promising something it cannot do.
  if (!source.search || source.id === 'manual') return renderDefault(props);

  return (
    <Stack space={3}>
      <Card padding={3} radius={2} tone="primary" border>
        <Stack space={3}>
          <Text size={1} weight="medium">
            Add from {source.label}
          </Text>

          <Flex gap={2}>
            <Box flex={1}>
              <TextInput
                value={query}
                placeholder={source.placeholder}
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
              {results.map((result, i) => (
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
                    {result.imageUrl && (
                      <img
                        src={result.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        style={{ borderRadius: 4, flexShrink: 0 }}
                      />
                    )}
                    <Stack space={2} flex={1}>
                      <Text size={1} weight="medium">
                        {result.name}
                      </Text>
                      {result.hint && (
                        <Text size={0} muted>
                          {result.hint}
                        </Text>
                      )}
                    </Stack>
                    {adding === result.name && <Spinner muted />}
                  </Flex>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      {renderDefault(props)}
    </Stack>
  );
}
