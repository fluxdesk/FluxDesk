import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AppShell } from '@/layouts/app-shell';
import { useInitials } from '@/hooks/use-initials';
import type { Company, Contact, PaginatedData, Sla } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Building, Mail, Pencil, Phone, Plus, Search, Ticket, Trash2, UserPlus } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { CompanyFormSheet } from '@/pages/companies/index';

interface ContactsFilters {
    search?: string;
}

interface Props {
    contacts: PaginatedData<Contact & { tickets_count: number }>;
    filters: ContactsFilters;
    slas: Sla[];
    companies: Pick<Company, 'id' | 'name'>[];
}

export default function ContactsIndex({ contacts, filters, slas, companies }: Props) {
    const { t } = useTranslation('contacts');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [deletingContact, setDeletingContact] = useState<(Contact & { tickets_count: number }) | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const getInitials = useInitials();

    const handleDelete = () => {
        if (!deletingContact) return;
        setIsDeleting(true);
        router.delete(`/contacts/${deletingContact.id}`, {
            onSuccess: () => {
                toast.success(t('notifications.deleted'));
                setDeletingContact(null);
            },
            onError: () => toast.error(t('notifications.delete_failed')),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            router.get('/contacts', { search: search || undefined }, { preserveState: true });
        },
        [search],
    );

    return (
        <AppShell>
            <Head title={t('title')} />

            <div className="flex min-h-full flex-col">
                {/* Header - Fixed */}
                <div className="shrink-0 border-b border-border/50 bg-background px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
                            <p className="text-sm text-muted-foreground">
                                {contacts.total === 1
                                    ? t('count', { count: contacts.total })
                                    : t('count_plural', { count: contacts.total })} {t('total')}
                            </p>
                        </div>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    {t('actions.add')}
                                </Button>
                            </DialogTrigger>
                            <ContactFormDialog slas={slas} companies={companies} onClose={() => setIsCreateOpen(false)} />
                        </Dialog>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleSearch} className="mt-4 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('search_placeholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </form>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {contacts.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-4 rounded-full bg-muted p-4">
                                <UserPlus className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mb-1 text-lg font-medium">{t('empty.title')}</h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                {t('empty.description')}
                            </p>
                            <Button onClick={() => setIsCreateOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('actions.add')}
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[250px]">{t('table.contact')}</TableHead>
                                    <TableHead>{t('table.email')}</TableHead>
                                    <TableHead>{t('table.company')}</TableHead>
                                    <TableHead>{t('table.phone')}</TableHead>
                                    <TableHead className="text-center">{t('table.tickets')}</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts.data.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                                        {getInitials(contact.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{contact.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" />
                                                {contact.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {contact.companyRelation ? (
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Building className="h-3.5 w-3.5" />
                                                    {contact.companyRelation.name}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground/50">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {contact.phone ? (
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {contact.phone}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground/50">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm">{contact.tickets_count}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <Dialog
                                                    open={editingContact?.id === contact.id}
                                                    onOpenChange={(open) =>
                                                        setEditingContact(open ? contact : null)
                                                    }
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <ContactFormDialog
                                                        contact={contact}
                                                        slas={slas}
                                                        companies={companies}
                                                        onClose={() => setEditingContact(null)}
                                                    />
                                                </Dialog>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setDeletingContact(contact)}
                                                    disabled={contact.tickets_count > 0}
                                                    title={contact.tickets_count > 0 ? t('delete_disabled_has_tickets') : undefined}
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
                open={!!deletingContact}
                onOpenChange={(open) => !open && setDeletingContact(null)}
                title={t('delete_dialog.title')}
                description={t('delete_dialog.description', { name: deletingContact?.name })}
                confirmLabel={t('actions.delete')}
                onConfirm={handleDelete}
                loading={isDeleting}
            />
        </AppShell>
    );
}

function ContactFormDialog({
    contact,
    slas,
    companies,
    onClose,
}: {
    contact?: Contact;
    slas: Sla[];
    companies: Pick<Company, 'id' | 'name'>[];
    onClose: () => void;
}) {
    const { t } = useTranslation('contacts');
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [localCompanies, setLocalCompanies] = useState(companies);
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: contact?.name || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        sla_id: contact?.sla_id?.toString() || '',
        company_id: contact?.company_id?.toString() || '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (contact) {
            patch(`/contacts/${contact.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/contacts', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    }

    const handleCompanyCreated = (newCompany: Company) => {
        setLocalCompanies(prev => [...prev, { id: newCompany.id, name: newCompany.name }]);
        setData('company_id', newCompany.id.toString());
        setIsCreatingCompany(false);
    };

    return (
        <>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{contact ? t('edit.title') : t('create.title')}</DialogTitle>
                        <DialogDescription>
                            {contact
                                ? t('edit.description')
                                : t('create.description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('fields.name')}</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder={t('fields.name_placeholder')}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('fields.email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder={t('fields.email_placeholder')}
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">{t('fields.phone')}</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder={t('fields.phone_placeholder')}
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="company" className="flex items-center justify-between">
                                <span>{t('fields.company')}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setIsCreatingCompany(true)}
                                >
                                    <Plus className="mr-1 h-3 w-3" />
                                    {t('fields.new_company')}
                                </Button>
                            </Label>
                            <Select
                                value={data.company_id || undefined}
                                onValueChange={(value) => setData('company_id', value === '__none__' ? '' : value)}
                            >
                                <SelectTrigger id="company">
                                    <SelectValue placeholder={t('fields.no_company')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">{t('fields.no_company')}</SelectItem>
                                    {localCompanies.map((company) => (
                                        <SelectItem key={company.id} value={company.id.toString()}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.company_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="sla">{t('fields.sla')}</Label>
                            <Select
                                value={data.sla_id || undefined}
                                onValueChange={(value) => setData('sla_id', value === '__default__' ? '' : value)}
                            >
                                <SelectTrigger id="sla">
                                    <SelectValue placeholder={t('fields.no_sla')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__default__">{t('fields.no_sla')}</SelectItem>
                                    {slas.map((sla) => (
                                        <SelectItem key={sla.id} value={sla.id.toString()}>
                                            {sla.name}{sla.is_default ? ` ${t('fields.sla_default_label')}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                {t('fields.sla_hint')}
                            </p>
                            <InputError message={errors.sla_id} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('actions.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {contact ? t('actions.update') : t('actions.add')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>

            {/* Nested Company Creation Sheet */}
            <Sheet open={isCreatingCompany} onOpenChange={setIsCreatingCompany}>
                <CompanyFormSheet
                    slas={slas}
                    onClose={() => setIsCreatingCompany(false)}
                    onSuccess={handleCompanyCreated}
                />
            </Sheet>
        </>
    );
}
