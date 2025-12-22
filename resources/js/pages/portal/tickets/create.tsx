import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PortalLayout from '@/layouts/portal/portal-layout';
import { type PortalSharedData } from '@/types/portal';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

export default function PortalTicketCreate() {
    const { organization } = usePage<PortalSharedData>().props;
    const primaryColor = organization?.settings?.primary_color ?? '#18181b';
    const orgSlug = organization?.slug ?? '';

    const form = useForm({
        subject: '',
        message: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/${orgSlug}/portal/tickets`);
    };

    return (
        <PortalLayout>
            <Head title="Nieuw ticket" />

            {/* Back link */}
            <div className="mb-4">
                <Link
                    href={`/${orgSlug}/portal`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    Terug naar overzicht
                </Link>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-xl">Nieuw support ticket</CardTitle>
                    <CardDescription>
                        Beschrijf je vraag of probleem zo duidelijk mogelijk. We reageren zo snel mogelijk.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Onderwerp</Label>
                            <Input
                                id="subject"
                                type="text"
                                placeholder="Korte omschrijving van je vraag"
                                value={form.data.subject}
                                onChange={(e) => form.setData('subject', e.target.value)}
                                disabled={form.processing}
                                autoFocus
                            />
                            {form.errors.subject && (
                                <p className="text-sm text-destructive">{form.errors.subject}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Bericht</Label>
                            <Textarea
                                id="message"
                                placeholder="Beschrijf je vraag of probleem in detail..."
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
                                    Annuleren
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
                                        Aanmaken...
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4 mr-2" />
                                        Ticket aanmaken
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
