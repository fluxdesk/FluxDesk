import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppShell } from '@/layouts/app-shell';
import { useInitials } from '@/hooks/use-initials';
import type { Company, Contact, PaginatedData, Sla, Ticket } from '@/types';
import { Head, router, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Building,
    Globe,
    Mail,
    MapPin,
    Pencil,
    Phone,
    StickyNote,
    Ticket as TicketIcon,
    Trash2,
    Unlink,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { CompanyFormSheet } from './index';

interface Props {
    company: Company & { contacts_count: number; tickets_count: number };
    contacts: PaginatedData<Contact & { tickets_count: number }>;
    recentTickets: Ticket[];
    openTicketsCount: number;
    slas: Sla[];
    availableContacts: { id: number; name: string | null; email: string }[];
}

export default function CompanyShow({
    company,
    contacts,
    recentTickets,
    openTicketsCount,
    slas,
    availableContacts,
}: Props) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLinkingContact, setIsLinkingContact] = useState(false);
    const [selectedContactId, setSelectedContactId] = useState<string>('');
    const [unlinkingContact, setUnlinkingContact] = useState<Contact | null>(null);
    const getInitials = useInitials();

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(`/companies/${company.id}`, {
            onSuccess: () => {
                toast.success('Bedrijf verwijderd');
            },
            onError: () => toast.error('Bedrijf verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleLinkContact = () => {
        if (!selectedContactId) return;
        router.post(
            `/companies/${company.id}/contacts/${selectedContactId}`,
            {},
            {
                onSuccess: () => {
                    toast.success('Contact gekoppeld aan bedrijf');
                    setIsLinkingContact(false);
                    setSelectedContactId('');
                },
                onError: () => toast.error('Contact koppelen mislukt'),
            },
        );
    };

    const handleUnlinkContact = () => {
        if (!unlinkingContact) return;
        router.delete(`/companies/${company.id}/contacts/${unlinkingContact.id}`, {
            onSuccess: () => {
                toast.success('Contact ontkoppeld van bedrijf');
                setUnlinkingContact(null);
            },
            onError: () => toast.error('Contact ontkoppelen mislukt'),
        });
    };

    return (
        <AppShell>
            <Head title={company.name} />

            <div className="flex min-h-full flex-col">
                {/* Header */}
                <div className="shrink-0 border-b border-border/50 bg-background px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/companies"
                            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
                            {company.domains && company.domains.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {company.domains.map((domain) => (
                                        <Badge key={domain} variant="secondary" className="font-normal text-xs">
                                            <Globe className="mr-1 h-3 w-3" />
                                            {domain}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline">
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Bewerken
                                    </Button>
                                </SheetTrigger>
                                <CompanyFormSheet
                                    company={company}
                                    slas={slas}
                                    onClose={() => setIsEditOpen(false)}
                                />
                            </Sheet>
                            <Button variant="outline" onClick={() => setIsDeleteOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Verwijderen
                            </Button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 flex gap-6">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{company.contacts_count}</span>
                            <span className="text-sm text-muted-foreground">contacten</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <TicketIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{company.tickets_count}</span>
                            <span className="text-sm text-muted-foreground">tickets totaal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={openTicketsCount > 0 ? 'default' : 'secondary'}>
                                {openTicketsCount} open
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Left Column - Info */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Bedrijfsgegevens</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {company.email && (
                                        <div className="flex items-start gap-3">
                                            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">E-mail</p>
                                                <a
                                                    href={`mailto:${company.email}`}
                                                    className="text-sm text-muted-foreground hover:text-primary"
                                                >
                                                    {company.email}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {company.phone && (
                                        <div className="flex items-start gap-3">
                                            <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Telefoon</p>
                                                <a
                                                    href={`tel:${company.phone}`}
                                                    className="text-sm text-muted-foreground hover:text-primary"
                                                >
                                                    {company.phone}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {company.website && (
                                        <div className="flex items-start gap-3">
                                            <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Website</p>
                                                <a
                                                    href={company.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-muted-foreground hover:text-primary"
                                                >
                                                    {company.website}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {company.address && (
                                        <div className="flex items-start gap-3">
                                            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Adres</p>
                                                <p className="whitespace-pre-line text-sm text-muted-foreground">
                                                    {company.address}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {company.sla && (
                                        <div className="flex items-start gap-3">
                                            <TicketIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">SLA</p>
                                                <p className="text-sm text-muted-foreground">{company.sla.name}</p>
                                            </div>
                                        </div>
                                    )}
                                    {!company.email &&
                                        !company.phone &&
                                        !company.website &&
                                        !company.address &&
                                        !company.sla && (
                                            <p className="text-sm text-muted-foreground">
                                                Geen gegevens ingevuld
                                            </p>
                                        )}
                                </CardContent>
                            </Card>

                            {company.notes && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <StickyNote className="h-4 w-4" />
                                            Notities
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="whitespace-pre-line text-sm text-muted-foreground">
                                            {company.notes}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column - Tabs */}
                        <div className="lg:col-span-2">
                            <Tabs defaultValue="contacts" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="contacts">
                                        Contacten ({company.contacts_count})
                                    </TabsTrigger>
                                    <TabsTrigger value="tickets">
                                        Recente tickets ({recentTickets.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="contacts" className="mt-4">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base">Contacten</CardTitle>
                                                <CardDescription>
                                                    Alle contacten die aan dit bedrijf gekoppeld zijn
                                                </CardDescription>
                                            </div>
                                            {availableContacts.length > 0 && (
                                                <Dialog
                                                    open={isLinkingContact}
                                                    onOpenChange={setIsLinkingContact}
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button size="sm">
                                                            <UserPlus className="mr-2 h-4 w-4" />
                                                            Contact koppelen
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Contact koppelen</DialogTitle>
                                                            <DialogDescription>
                                                                Selecteer een contact om aan dit bedrijf te
                                                                koppelen.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Select
                                                                value={selectedContactId}
                                                                onValueChange={setSelectedContactId}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecteer een contact" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableContacts.map((contact) => (
                                                                        <SelectItem
                                                                            key={contact.id}
                                                                            value={contact.id.toString()}
                                                                        >
                                                                            {contact.name || contact.email} ({contact.email})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <DialogFooter className="gap-2">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setIsLinkingContact(false)}
                                                            >
                                                                Annuleren
                                                            </Button>
                                                            <Button
                                                                onClick={handleLinkContact}
                                                                disabled={!selectedContactId}
                                                            >
                                                                Koppelen
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            {contacts.data.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                                    <Users className="mb-2 h-8 w-8 text-muted-foreground" />
                                                    <p className="text-sm text-muted-foreground">
                                                        Nog geen contacten gekoppeld
                                                    </p>
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Contact</TableHead>
                                                            <TableHead>E-mail</TableHead>
                                                            <TableHead className="text-center">
                                                                Tickets
                                                            </TableHead>
                                                            <TableHead className="w-[50px]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {contacts.data.map((contact) => (
                                                            <TableRow key={contact.id}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="h-8 w-8">
                                                                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                                                                    {getInitials(contact.name || contact.email)}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <span className="font-medium">
                                                                            {contact.name || contact.email}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground">
                                                                    {contact.email}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {contact.tickets_count}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => setUnlinkingContact(contact)}
                                                                        title="Ontkoppelen"
                                                                    >
                                                                        <Unlink className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="tickets" className="mt-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Recente tickets</CardTitle>
                                            <CardDescription>
                                                De meest recente tickets van dit bedrijf
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {recentTickets.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                                    <TicketIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                                                    <p className="text-sm text-muted-foreground">
                                                        Nog geen tickets
                                                    </p>
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Ticket</TableHead>
                                                            <TableHead>Contact</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Prioriteit</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {recentTickets.map((ticket) => (
                                                            <TableRow key={ticket.id}>
                                                                <TableCell>
                                                                    <Link
                                                                        href={`/inbox/${ticket.id}`}
                                                                        className="font-medium hover:text-primary"
                                                                    >
                                                                        {ticket.ticket_number}
                                                                    </Link>
                                                                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                                        {ticket.subject}
                                                                    </p>
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground">
                                                                    {ticket.contact?.name || ticket.contact?.email}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {ticket.status && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            style={{
                                                                                borderColor: ticket.status.color,
                                                                                color: ticket.status.color,
                                                                            }}
                                                                        >
                                                                            {ticket.status.name}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {ticket.priority && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            style={{
                                                                                borderColor: ticket.priority.color,
                                                                                color: ticket.priority.color,
                                                                            }}
                                                                        >
                                                                            {ticket.priority.name}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                            {company.tickets_count > recentTickets.length && (
                                                <div className="mt-4 text-center">
                                                    <Link
                                                        href={`/companies/${company.id}/tickets`}
                                                        className="text-sm text-primary hover:underline"
                                                    >
                                                        Bekijk alle {company.tickets_count} tickets
                                                    </Link>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                title="Bedrijf verwijderen"
                description={`Weet je zeker dat je ${company.name} wilt verwijderen? Gekoppelde contacten worden ontkoppeld maar niet verwijderd.`}
                confirmLabel="Verwijderen"
                onConfirm={handleDelete}
                loading={isDeleting}
            />

            <ConfirmationDialog
                open={!!unlinkingContact}
                onOpenChange={(open) => !open && setUnlinkingContact(null)}
                title="Contact ontkoppelen"
                description={`Weet je zeker dat je ${unlinkingContact?.name || unlinkingContact?.email} wilt ontkoppelen van dit bedrijf?`}
                confirmLabel="Ontkoppelen"
                onConfirm={handleUnlinkContact}
            />
        </AppShell>
    );
}
