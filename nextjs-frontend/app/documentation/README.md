# Documentation Screen

This documentation screen provides a UI for browsing documentation and API references, with a tree view in the left sidebar and markdown content in the main panel.

## Setup

To fully enable markdown rendering, you need to install the following dependencies:

```bash
npm install react-markdown rehype-highlight rehype-raw remark-gfm
# or
yarn add react-markdown rehype-highlight rehype-raw remark-gfm
# or 
pnpm add react-markdown rehype-highlight rehype-raw remark-gfm
```

Then update the `MarkdownRenderer.tsx` component to use these libraries:

```typescript
import React from 'react';
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) {
    return (
      <div className="text-center text-gray-500 py-10">
        No content available
      </div>
    );
  }

  return (
    <ReactMarkdown
      className="prose prose-sm md:prose lg:prose-lg dark:prose-invert max-w-none"
      rehypePlugins={[rehypeHighlight, rehypeRaw]}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
```

You may also need to add the Tailwind typography plugin for better markdown styling:

```bash
npm install -D @tailwindcss/typography
# or
yarn add -D @tailwindcss/typography
# or
pnpm add -D @tailwindcss/typography
```

Then update your `tailwind.config.js`:

```js
module.exports = {
  // ...
  plugins: [
    // ...
    require('@tailwindcss/typography'),
  ],
}
```