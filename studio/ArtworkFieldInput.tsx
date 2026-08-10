import { Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { useCallback, useState } from 'react';
import { set, useClient, useFormValue, type ObjectInputProps } from 'sanity';

import { SOURCES, type ArtworkResult } from './artwork-sources';

/**
 * Adds "Fetch artwork" to an item that already exists.
 *
 * The search row on the array only helps when adding something new. An item
 * typed by hand, or imported without a picture, had no way to get one short of
 * finding the image yourself. This searches by the item's own name, using
 * whichever source the list names.
 *
 * Results are offered rather than the first one taken. A search for "The Daily"
 * matches several things, and silently attaching the wrong logo is worse than
 * asking.
 */
export function ArtworkFieldInput(props: ObjectInputProps) {
  const { onChange, path, renderDefault } = props;
  const client = useClient({ apiVersion: '2025-08-15' });

  // `path` ends at this image field, so its parent is the item and a sibling
  // step gets the name to search for.
  const namePath = [...path.slice(0, -1), 'name'];
  const name = useFormValue(namePath) as string | undefined;

  const sourceId = (useFormValue(['source']) as string | undefined) ?? 'manual';
  const source = SOURCES[sourceId] ?? SOURCES.manual;

  const [results, setResults] = useState<ArtworkResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const found = await source.search(name);
      setResults(found);
      if (!found.length) setError(`Nothing found for “${name}”`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [name, source]);

  const choose = useCallback(
    async (result: ArtworkResult) => {
      setBusy(true);
      setError(null);
      try {
        const url =
          result.imageUrl ?? (await source.listImages?.(result))?.[0];
        if (!url) throw new Error('That result has no picture');

        const blob = await fetch(url).then((r) => {
          if (!r.ok) throw new Error(`Artwork fetch failed (${r.status})`);
          return r.blob();
        });
        const asset = await client.assets.upload('image', blob, {
          filename: `${(name ?? 'artwork')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')}.jpg`,
        });

        onChange(
          set({
            _type: 'image',
            asset: { _type: 'reference', _ref: asset._id },
          })
        );
        setResults([]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [client, name, onChange, source]
  );

  // Nothing to offer without a name to search, or a source that returns
  // pictures. The plain upload field is still there in both cases.
  const canFetch = Boolean(name) && source.providesArtwork;

  return (
    <Stack space={3}>
      {renderDefault(props)}

      {canFetch && (
        <Stack space={2}>
          <Flex gap={2} align="center">
            <Button
              text={busy ? 'Working…' : `Fetch artwork from ${source.label}`}
              mode="ghost"
              disabled={busy}
              onClick={search}
            />
            {busy && <Spinner muted />}
          </Flex>

          {error && (
            <Text size={1} muted>
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
                  onClick={() => choose(result)}
                  disabled={busy}
                  style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <Flex align="center" gap={3}>
                    {result.imageUrl && (
                      <img
                        src={result.imageUrl}
                        alt=""
                        width={36}
                        height={36}
                        style={{ borderRadius: 4, flexShrink: 0 }}
                      />
                    )}
                    <Stack space={2} flex={1}>
                      <Text size={1}>{result.name}</Text>
                      {result.hint && (
                        <Text size={0} muted>
                          {result.hint}
                        </Text>
                      )}
                    </Stack>
                  </Flex>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
