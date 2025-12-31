import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/ui/tag-input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { AppShell } from '@/layouts/app-shell';
import type { Company, PaginatedData, Sla } from '@/types';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    Building,
    Globe,
    Pencil,
    Plus,
    Search,
    Ticket,
    Trash2,
    Users,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface CompaniesFilters {
    search?: string;
}

interface Props {
    companies: PaginatedData<Company>;
    filters: CompaniesFilters;
    slas: Sla[];
}

export default function CompaniesIndex({ companies, filters, slas }: Props) {
    const { t } = useTranslation('contacts');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState(filters.search || '');

    const handleDelete = () => {
        if (!deletingCompany) return;
        setIsDeleting(true);
        router.delete(`/companies/${deletingCompany.id}`, {
            onSuccess: () => {
                toast.success(t('companies.notifications.deleted'));
                setDeletingCompany(null);
            },
            onError: () => toast.error(t('companies.notifications.delete_failed')),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            router.get('/companies', { search: search || undefined }, { preserveState: true });
        },
        [search],
    );

    return (
        <AppShell>
            <Head title={t('companies.page_title')} />

            <div className="flex min-h-full flex-col">
                {/* Header - Fixed */}
                <div className="shrink-0 border-b border-border/50 bg-background px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{t('companies.title')}</h1>
                            <p className="text-sm text-muted-foreground">
                                {companies.total === 1
                                    ? t('companies.count', { count: companies.total })
                                    : t('companies.count_plural', { count: companies.total })} {t('companies.total')}
                            </p>
                        </div>
                        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <SheetTrigger asChild>
                                <Button>
                                    <Building className="mr-2 h-4 w-4" />
                                    {t('companies.create.button')}
                                </Button>
                            </SheetTrigger>
                            <CompanyFormSheet slas={slas} onClose={() => setIsCreateOpen(false)} />
                        </Sheet>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleSearch} className="mt-4 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('companies.search_placeholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </form>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {companies.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-4 rounded-full bg-muted p-4">
                                <Building className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mb-1 text-lg font-medium">{t('companies.empty.title')}</h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                {t('companies.empty.description')}
                            </p>
                            <Button onClick={() => setIsCreateOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('companies.create.button')}
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[250px]">{t('companies.table.company')}</TableHead>
                                        <TableHead>{t('companies.table.domains')}</TableHead>
                                        <TableHead className="text-center">{t('companies.table.contacts')}</TableHead>
                                        <TableHead className="text-center">{t('companies.table.tickets')}</TableHead>
                                        <TableHead>{t('companies.table.sla')}</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companies.data.map((company) => (
                                        <TableRow key={company.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/companies/${company.id}`}
                                                    className="flex items-center gap-3 hover:text-primary"
                                                >
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                        <Building className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium">{company.name}</span>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {company.domains && company.domains.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {company.domains.slice(0, 3).map((domain) => (
                                                            <Badge key={domain} variant="secondary" className="font-normal">
                                                                <Globe className="mr-1 h-3 w-3" />
                                                                {domain}
                                                            </Badge>
                                                        ))}
                                                        {company.domains.length > 3 && (
                                                            <Badge variant="outline" className="font-normal">
                                                                +{company.domains.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground/50">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-sm">{company.contacts_count || 0}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-sm">{company.tickets_count || 0}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {company.sla ? (
                                                    <span className="text-sm">{company.sla.name}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground/50">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Sheet
                                                        open={editingCompany?.id === company.id}
                                                        onOpenChange={(open) =>
                                                            setEditingCompany(open ? company : null)
                                                        }
                                                    >
                                                        <SheetTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </SheetTrigger>
                                                        <CompanyFormSheet
                                                            company={company}
                                                            slas={slas}
                                                            onClose={() => setEditingCompany(null)}
                                                        />
                                                    </Sheet>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setDeletingCompany(company)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationDialog
                open={!!deletingCompany}
                onOpenChange={(open) => !open && setDeletingCompany(null)}
                title={t('companies.delete.title')}
                description={t('companies.delete.description', { name: deletingCompany?.name })}
                confirmLabel={t('companies.delete.confirm')}
                onConfirm={handleDelete}
                loading={isDeleting}
            />
        </AppShell>
    );
}

export function CompanyFormSheet({
    company,
    slas,
    onClose,
    onSuccess,
}: {
    company?: Company;
    slas: Sla[];
    onClose: () => void;
    onSuccess?: (company: Company) => void;
}) {
    const { t } = useTranslation('contacts');
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: company?.name || '',
        email: company?.email || '',
        phone: company?.phone || '',
        website: company?.website || '',
        domains: company?.domains || [],
        address: company?.address || '',
        notes: company?.notes || '',
        sla_id: company?.sla_id?.toString() || '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (company) {
            patch(`/companies/${company.id}`, {
                onSuccess: (page) => {
                    reset();
                    onClose();
                    onSuccess?.(page.props.company as Company);
                },
            });
        } else {
            post('/companies', {
                onSuccess: (page) => {
                    reset();
                    onClose();
                    onSuccess?.(page.props.company as Company);
                },
            });
        }
    }

    return (
        <SheetContent className="sm:max-w-md">
            <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
                <SheetHeader className="shrink-0">
                    <SheetTitle>
                        {company ? t('companies.edit.title') : t('companies.create.title')}
                    </SheetTitle>
                    <SheetDescription>
                        {company
                            ? t('companies.edit.description')
                            : t('companies.create.description')}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">
                            {t('companies.fields.name_required')} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('companies.fields.name_placeholder')}
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('companies.fields.email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder={t('companies.fields.email_placeholder')}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">{t('companies.fields.phone')}</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder={t('companies.fields.phone_placeholder')}
                        />
                        <InputError message={errors.phone} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="website">{t('companies.fields.website')}</Label>
                        <Input
                            id="website"
                            type="url"
                            value={data.website}
                            onChange={(e) => setData('website', e.target.value)}
                            placeholder={t('companies.fields.website_placeholder')}
                        />
                        <InputError message={errors.website} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="domains">{t('companies.fields.domains')}</Label>
                        <TagInput
                            id="domains"
                            value={data.domains}
                            onChange={(domains) => setData('domains', domains)}
                            placeholder={t('companies.fields.domains_placeholder')}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('companies.fields.domains_hint')}
                        </p>
                        <InputError message={errors.domains} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">{t('companies.fields.address')}</Label>
                        <Textarea
                            id="address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            placeholder={t('companies.fields.address_placeholder')}
                            rows={2}
                            className="resize-none"
                        />
                        <InputError message={errors.address} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t('companies.fields.notes')}</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder={t('companies.fields.notes_placeholder')}
                            rows={2}
                            className="resize-none"
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="sla">{t('companies.fields.sla')}</Label>
                        <Select
                            value={data.sla_id || undefined}
                            onValueChange={(value) => setData('sla_id', value === '__default__' ? '' : value)}
                        >
                            <SelectTrigger id="sla">
                                <SelectValue placeholder={t('companies.fields.sla_default')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__default__">{t('companies.fields.sla_default')}</SelectItem>
                                {slas.map((sla) => (
                                    <SelectItem key={sla.id} value={sla.id.toString()}>
                                        {sla.name}{sla.is_default ? ` ${t('companies.fields.sla_default_label')}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.sla_id} />
                    </div>
                </div>

                <SheetFooter className="shrink-0 border-t px-4 py-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('actions.cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {company ? t('actions.update') : t('actions.create')}
                    </Button>
                </SheetFooter>
            </form>
        </SheetContent>
    );
}
