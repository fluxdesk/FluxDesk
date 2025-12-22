import { useEffect, useRef } from 'react';
import { MessageItem } from '@/components/tickets/message-item';
import type { Message } from '@/types';

interface MessageThreadProps {
    messages: Message[];
}

export function MessageThread({ messages }: MessageThreadProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((message) => (
                    <MessageItem key={message.id} message={message} />
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
