import type {
  Image,
  Paragraph,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
} from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

/**
 * An image alone in a paragraph becomes a `<figure>`. An italic line in the
 * paragraph below it becomes the `<figcaption>` of that figure.
 *
 *     ![Alt text](./photo.jpg)
 *
 *     _Caption, which can carry an [attribution](https://example.com) link._
 *
 * A post body stays plain markdown this way, with no import and no JSX, so a
 * program that edits a body must know markdown and nothing else. The caption is
 * markdown too, which is where the link comes from.
 */

declare module 'mdast' {
  interface RootContentMap {
    figure: Figure;
    figcaption: Figcaption;
  }
  interface BlockContentMap {
    figure: Figure;
  }
}

/**
 * `mdast-util-to-hast` gives an unknown node type a `<div>`, and `data.hName`
 * changes that tag. So these two types need no handler of their own.
 */
export interface Figure extends Parent {
  type: 'figure';
  children: [Image] | [Image, Figcaption];
  data: { hName: 'figure' };
}

export interface Figcaption extends Parent {
  type: 'figcaption';
  children: PhrasingContent[];
  data: { hName: 'figcaption' };
}

/** The image, if the paragraph holds an image and no words. */
function imageAlone(node: Paragraph): Image | undefined {
  const [child] = node.children;
  return node.children.length === 1 && child?.type === 'image'
    ? child
    : undefined;
}

/** The caption content, if the node is a paragraph fully in italics. */
function captionAlone(
  node: RootContent | undefined
): PhrasingContent[] | undefined {
  if (node?.type !== 'paragraph' || node.children.length !== 1)
    return undefined;
  const [child] = node.children;
  return child?.type === 'emphasis' ? child.children : undefined;
}

export default function remarkFigure() {
  return (tree: Root): undefined => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (parent === undefined || index === undefined) return;

      const image = imageAlone(node);
      if (image === undefined) return;

      // The walk has not reached the caption yet, so removing it here just
      // means the next step lands on the node after it. Removing a node before
      // the current index would shift the walk and skip one.
      const caption = captionAlone(parent.children[index + 1]);
      if (caption !== undefined) parent.children.splice(index + 1, 1);

      // An image with no alt text and no caption reaches a screen reader as
      // nothing at all. With a caption, an empty alt is a real choice: the
      // caption describes the image, and an alt repeating it says it twice.
      if (caption === undefined && !image.alt?.trim()) {
        console.warn(
          `[remark-figure] no alt text and no caption: ${image.url}`
        );
      }

      // The emphasis does not stay. A `figcaption` reads as a caption already,
      // and the design gives it a style. Italics would say the same thing again.
      const figure: Figure = {
        type: 'figure',
        data: { hName: 'figure' },
        children:
          caption === undefined
            ? [image]
            : [
                image,
                {
                  type: 'figcaption',
                  data: { hName: 'figcaption' },
                  children: caption,
                },
              ],
      };

      parent.children[index] = figure;
      return SKIP;
    });
  };
}
