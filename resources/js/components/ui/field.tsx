import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type FieldProps = React.HTMLAttributes<HTMLDivElement>;

function Field({ className, ...props }: FieldProps) {
    return (
        <div
            data-slot="field"
            className={cn('flex flex-col gap-2', className)}
            {...props}
        />
    );
}

function FieldGroup({ className, ...props }: FieldProps) {
    return (
        <div
            data-slot="field-group"
            className={cn('flex flex-col gap-6', className)}
            {...props}
        />
    );
}

function FieldLabel({
    className,
    ...props
}: React.ComponentProps<typeof Label>) {
    return <Label className={cn('', className)} {...props} />;
}

type FieldDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

function FieldDescription({ className, children, ...props }: FieldDescriptionProps) {
    return (
        <p
            data-slot="field-description"
            className={cn('text-sm text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground', className)}
            {...props}
        >
            {children}
        </p>
    );
}

interface FieldSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

function FieldSeparator({ className, children, ...props }: FieldSeparatorProps) {
    return (
        <div
            data-slot="field-separator"
            className={cn('relative', className)}
            {...props}
        >
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            {children && (
                <div className="relative flex justify-center text-xs uppercase">
                    <span
                        data-slot="field-separator-content"
                        className="bg-background px-2 text-muted-foreground"
                    >
                        {children}
                    </span>
                </div>
            )}
        </div>
    );
}

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator };
