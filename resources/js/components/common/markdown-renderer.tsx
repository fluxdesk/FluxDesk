import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    // Highlight @mentions in the content before rendering
    const processedContent = React.useMemo(() => {
        return content;
    }, [content]);

    return (
        <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // Custom image renderer for inline images
                img: ({ node, ...props }) => (
                    <img
                        {...props}
                        className="max-h-64 rounded-lg"
                        loading="lazy"
                    />
                ),
                // Secure links - open in new tab
                a: ({ node, ...props }) => (
                    <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    />
                ),
                // Styled paragraphs for better spacing
                p: ({ node, ...props }) => (
                    <p {...props} className="mb-2 last:mb-0" />
                ),
                // Styled lists
                ul: ({ node, ...props }) => (
                    <ul {...props} className="mb-2 ml-4 list-disc last:mb-0" />
                ),
                ol: ({ node, ...props }) => (
                    <ol {...props} className="mb-2 ml-4 list-decimal last:mb-0" />
                ),
                li: ({ node, ...props }) => (
                    <li {...props} className="mb-1" />
                ),
                // Code styling
                code: ({ node, className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                        <code
                            {...props}
                            className="rounded bg-muted px-1 py-0.5 text-sm"
                        >
                            {children}
                        </code>
                    ) : (
                        <code {...props} className={className}>
                            {children}
                        </code>
                    );
                },
                // Pre for code blocks
                pre: ({ node, ...props }) => (
                    <pre
                        {...props}
                        className="mb-2 overflow-x-auto rounded-lg bg-muted p-3 text-sm last:mb-0"
                    />
                ),
            }}
        >
            {processedContent}
        </ReactMarkdown>
        </div>
    );
}
