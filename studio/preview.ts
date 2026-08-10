import type { DocumentActionComponent, DocumentActionsContext } from 'sanity';

/**
 * The two fields a preview link needs. Both optional: the action is on every
 * document type, and a document has no slug until someone gives it one.
 */
type PreviewDoc = { _type?: string; slug?: { current?: string } };

/**
 * Where a document lives on the built site.
 *
 * The studio has to know the site's routing to link at it. Keeping that in one
 * function means a route change is a change here, not in three document
 * actions -- and `/writing` rather than `/blog` is the kind of detail that
 * would otherwise be wrong in only one of them.
 */
function pathFor(doc: PreviewDoc | null | undefined) {
  const slug = doc?.slug?.current;
  if (!slug) return undefined;
  if (doc._type === 'post') return `/writing/${slug}/`;
  if (doc._type === 'list') return `/lists/${slug}/`;
  if (doc._type === 'project') return `/projects/${slug}/`;
  return undefined;
}

/**
 * "Open preview" on every document.
 *
 * Deliberately a link out rather than an embedded iframe pane: the preview is
 * a real build of the real site at a real URL, so it can be opened on a phone,
 * shared, or checked at a narrow width. An iframe would show the same page in
 * a box the size of half the studio, which is the one place layout problems
 * hide.
 *
 * The URL needs no origin and no setting for one. The studio is a route on the
 * site, so `/writing/x/` from here is the same host the studio is served from,
 * whether that is localhost or the deployed site.
 */
export const previewAction: DocumentActionComponent = (props) => {
  // A Sanity document is a bag of whatever its schema holds, so the two fields
  // this needs are named rather than asserted from `SanityDocument`.
  const doc = (props.draft ?? props.published) as PreviewDoc | null;
  const path = pathFor(doc);

  return {
    label: 'Open preview',
    disabled: !path,
    title: path ?? 'Give the document a slug first',
    onHandle: () => {
      if (path) window.open(path, '_blank', 'noopener');
      props.onComplete?.();
    },
  };
};

/** Adds the action to every document type without listing them one by one. */
export const documentActions = (
  prev: DocumentActionComponent[],
  _context: DocumentActionsContext
) => [...prev, previewAction];
