import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { mdxComponents } from "./mdx";

/** Renders MDX body text (from the content loader) as a React server component,
 *  with GFM, heading anchors, and dual-theme syntax highlighting. */
export function MdxContent({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={mdxComponents}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [
              rehypePrettyCode,
              {
                theme: { light: "github-light", dark: "github-dark" },
                keepBackground: false,
              },
            ],
          ],
        },
      }}
    />
  );
}
