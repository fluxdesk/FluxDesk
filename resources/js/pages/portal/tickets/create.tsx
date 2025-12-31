import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PortalLayout from '@/layouts/portal/portal-layout';
import { type PortalSharedData } from '@/types/portal';
import { type Department } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
    departments: Department[];
}

export default function PortalTicketCreate({ departments }: Props) {
    const { t } = useTranslation('portal');
    const { organization } = usePage<PortalSharedData>().props;
    const primaryColor = organization?.settings?.primary_color ?? '#18181b';
    const orgSlug = organization?.slug ?? '';

    // Find the default department
    const defaultDepartment = useMemo(() => {
        return departments.find((d) => d.is_default) || departments[0];
    }, [departments]);

    const form = useForm({
        subject: '',
        department_id: defaultDepartment?.id.toString() || '',
        message: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/${orgSlug}/portal/tickets`);
    };

    return (
        <PortalLayout>
            <Head title={t('create_ticket.page_title')} />

            {/* Back link */}
            <div className="mb-4">
                <Link
                    href={`/${orgSlug}/portal`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    {t('create_ticket.back_to_overview')}
                </Link>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-xl">{t('create_ticket.title')}</CardTitle>
                    <CardDescription>
                        {t('create_ticket.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="subject">{t('create_ticket.subject')}</Label>
                            <Input
                                id="subject"
                                type="text"
                                placeholder={t('create_ticket.subject_placeholder')}
                                value={form.data.subject}
                                onChange={(e) => form.setData('subject', e.target.value)}
                                disabled={form.processing}
                                autoFocus
                            />
                            {form.errors.subject && (
                                <p className="text-sm text-destructive">{form.errors.subject}</p>
                            )}
                        </div>

                        {departments.length > 1 && (
                            <div className="space-y-2">
                                <Label htmlFor="department_id">{t('create_ticket.department')}</Label>
                                <Select
                                    value={form.data.department_id}
                                    onValueChange={(value) => form.setData('department_id', value)}
                                    disabled={form.processing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('create_ticket.department_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((department) => (
                                            <SelectItem
                                                key={department.id}
                                                value={department.id.toString()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: department.color }}
                                                    />
                                                    {department.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.department_id && (
                                    <p className="text-sm text-destructive">{form.errors.department_id}</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="message">{t('create_ticket.message')}</Label>
                            <Textarea
                                id="message"
                                placeholder={t('create_ticket.message_placeholder')}
                                value={form.data.message}
                                onChange={(e) => form.setData('message', e.target.value)}
                                disabled={form.processing}
                                rows={8}
                                className="resize-none"
                            />
                            {form.errors.message && (
                                <p className="text-sm text-destructive">{form.errors.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Link href={`/${orgSlug}/portal`}>
                                <Button type="button" variant="ghost" disabled={form.processing}>
                                    {t('create_ticket.cancel')}
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={form.processing || !form.data.subject.trim() || !form.data.message.trim()}
                                className="text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {form.processing ? (
                                    <>
                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                        {t('create_ticket.submitting')}
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4 mr-2" />
                                        {t('create_ticket.submit')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </PortalLayout>
    );
}
