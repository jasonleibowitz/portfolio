import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Spinner,
  Stack,
  Text,
  TextInput,
} from '@sanity/ui';
import { useCallback, useState } from 'react';
import { set, useClient, useFormValue, type ObjectInputProps } from 'sanity';

import { SOURCES, type ArtworkResult } from './artwork-sources';
import { uploadFromUrl } from './upload';

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
  const [images, setImages] = useState<string[]>([]);
  const [manualUrl, setManualUrl] = useState('');
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

  /** Uploads one picture and puts it in the field. */
  const use = useCallback(
    async (url: string) => {
      setBusy(true);
      setError(null);
      try {
        onChange(set(await uploadFromUrl(client, url, name ?? 'artwork')));
        setResults([]);
        setImages([]);
        setManualUrl('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [client, name, onChange]
  );

  /**
   * A result was picked. One picture goes straight in; several are offered,
   * because the first photograph Google holds for a bar is as likely to be
   * somebody's cocktail as the room.
   */
  const choose = useCallback(
    async (result: ArtworkResult) => {
      if (result.imageUrl && !source.listImages) return use(result.imageUrl);

      setBusy(true);
      setError(null);
      try {
        const found = (await source.listImages?.(result)) ?? [];
        if (found.length === 1) return use(found[0]);
        if (!found.length) throw new Error('That result has no picture');
        setImages(found);
        setResults([]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [source, use]
  );

  // Nothing to search without a name, or without a source that returns
  // pictures. Pasting a URL still works in both cases, which is the point of
  // offering it separately: it is the answer when everything else has failed.
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
          {images.length > 0 && (
            <Stack space={2}>
              <Text size={1} muted>
                Pick one, logos first
              </Text>
              <Grid columns={4} gap={2}>
                {images.map((url, i) => (
                  <Card
                    key={i}
                    padding={0}
                    radius={2}
                    overflow="hidden"
                    border
                    as="button"
                    onClick={() => use(url)}
                    disabled={busy}
                    style={{ cursor: 'pointer', aspectRatio: '1', padding: 0 }}
                  >
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        background: '#fff',
                        display: 'block',
                      }}
                    />
                  </Card>
                ))}
              </Grid>
            </Stack>
          )}

          {/* Always available. Nothing found, or nothing good, is a normal
              outcome, and pasting the right URL should not need a search. */}
          <Flex gap={2}>
            <Box flex={1}>
              <TextInput
                value={manualUrl}
                placeholder="Or paste an image URL…"
                onChange={(e) => setManualUrl(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualUrl.trim()) {
                    e.preventDefault();
                    use(manualUrl.trim());
                  }
                }}
              />
            </Box>
            <Button
              text="Use URL"
              mode="default"
              disabled={busy || !manualUrl.trim()}
              onClick={() => use(manualUrl.trim())}
            />
          </Flex>
        </Stack>
      )}
    </Stack>
  );
}
