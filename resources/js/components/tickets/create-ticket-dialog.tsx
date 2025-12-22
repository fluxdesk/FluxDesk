import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { store } from '@/routes/inbox';
import type { Contact, Status, Priority, User, EmailChannel } from '@/types';
import { useForm } from '@inertiajs/react';
import { Check, ChevronDown, Plus, Mail } from 'lucide-react';
import { useState, useMemo } from 'react';

interface CreateTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Contact[];
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    emailChannels: EmailChannel[];
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CreateTicketDialog({
    open,
    onOpenChange,
    contacts,
    statuses,
    priorities,
    agents,
    emailChannels,
}: CreateTicketDialogProps) {
    const [contactOpen, setContactOpen] = useState(false);
    const [contactSearch, setContactSearch] = useState('');

    // Find the default email channel
    const defaultEmailChannel = useMemo(() => {
        return emailChannels.find((c) => c.is_default) || emailChannels[0];
    }, [emailChannels]);

    const { data, setData, post, processing, errors, reset } = useForm({
        subject: '',
        contact_id: '',
        contact_email: '',
        contact_name: '',
        status_id: '',
        priority_id: '',
        assigned_to: '',
        email_channel_id: defaultEmailChannel?.id.toString() || '',
        message: '',
    });

    // Filter contacts based on search
    const filteredContacts = useMemo(() => {
        if (!contactSearch) return contacts;
        const search = contactSearch.toLowerCase();
        return contacts.filter(
            (contact) =>
                contact.name?.toLowerCase().includes(search) ||
                contact.email.toLowerCase().includes(search)
        );
    }, [contacts, contactSearch]);

    // Get the selected contact for display
    const selectedContact = useMemo(() => {
        if (data.contact_id) {
            return contacts.find((c) => c.id.toString() === data.contact_id);
        }
        return null;
    }, [contacts, data.contact_id]);

    // Display text for the trigger button
    const contactDisplayText = useMemo(() => {
        if (selectedContact) {
            return `${selectedContact.name || selectedContact.email} (${selectedContact.email})`;
        }
        if (data.contact_email) {
            return data.contact_name ? `${data.contact_name} (${data.contact_email})` : data.contact_email;
        }
        return 'Selecteer of voer e-mail in...';
    }, [selectedContact, data.contact_email, data.contact_name]);

    function handleSelectContact(contact: Contact) {
        setData((prev) => ({
            ...prev,
            contact_id: contact.id.toString(),
            contact_email: '',
            contact_name: '',
        }));
        setContactSearch('');
        setContactOpen(false);
    }

    function handleCreateNewContact() {
        if (isValidEmail(contactSearch)) {
            setData((prev) => ({
                ...prev,
                contact_id: '',
                contact_email: contactSearch,
                contact_name: '',
            }));
            setContactSearch('');
            setContactOpen(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(store().url, {
            onSuccess: () => {
                reset();
                setContactSearch('');
                onOpenChange(false);
            },
        });
    }

    function handleClose() {
        reset();
        setContactSearch('');
        onOpenChange(false);
    }

    const defaultStatus = statuses.find((s) => s.is_default);
    const defaultPriority = priorities.find((p) => p.is_default);

    // Check if search is a new email not in contacts
    const isNewEmail = useMemo(() => {
        if (!isValidEmail(contactSearch)) return false;
        return !contacts.some((c) => c.email.toLowerCase() === contactSearch.toLowerCase());
    }, [contactSearch, contacts]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Nieuw ticket aanmaken</DialogTitle>
                        <DialogDescription>
                            Maak een nieuw supportticket aan voor een klant.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="subject">Onderwerp</Label>
                            <Input
                                id="subject"
                                value={data.subject}
                                onChange={(e) => setData('subject', e.target.value)}
                                placeholder="Korte beschrijving van het probleem"
                            />
                            <InputError message={errors.subject} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Klant</Label>
                            <Popover open={contactOpen} onOpenChange={setContactOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        role="combobox"
                                        aria-expanded={contactOpen}
                                        className={cn(
                                            "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]",
                                            !selectedContact && !data.contact_email && "text-muted-foreground"
                                        )}
                                    >
                                        <span className="truncate">{contactDisplayText}</span>
                                        <ChevronDown className="size-4 opacity-50" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Zoek klant of voer e-mail in..."
                                            value={contactSearch}
                                            onValueChange={setContactSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                {isNewEmail ? (
                                                    <button
                                                        type="button"
                                                        className="flex w-full items-center gap-2 px-2 py-3 text-sm hover:bg-accent"
                                                        onClick={handleCreateNewContact}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Nieuw contact aanmaken: {contactSearch}
                                                    </button>
                                                ) : contactSearch ? (
                                                    <p className="py-3 text-center text-sm text-muted-foreground">
                                                        Voer een geldig e-mailadres in om een nieuw contact aan te maken
                                                    </p>
                                                ) : (
                                                    <p className="py-3 text-center text-sm text-muted-foreground">
                                                        Geen contacten gevonden
                                                    </p>
                                                )}
                                            </CommandEmpty>
                                            {isNewEmail && (
                                                <CommandGroup heading="Nieuw contact">
                                                    <CommandItem onSelect={handleCreateNewContact}>
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Nieuw contact: {contactSearch}
                                                    </CommandItem>
                                                </CommandGroup>
                                            )}
                                            {filteredContacts.length > 0 && (
                                                <CommandGroup heading="Bestaande contacten">
                                                    {filteredContacts.map((contact) => (
                                                        <CommandItem
                                                            key={contact.id}
                                                            value={contact.id.toString()}
                                                            onSelect={() => handleSelectContact(contact)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    data.contact_id === contact.id.toString()
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0'
                                                                )}
                                                            />
                                                            <span className="truncate">
                                                                {contact.name || contact.email}
                                                            </span>
                                                            <span className="ml-2 truncate text-muted-foreground">
                                                                {contact.email}
                                                            </span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <InputError message={errors.contact_id || errors.contact_email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="message">Eerste bericht</Label>
                            <Textarea
                                id="message"
                                value={data.message}
                                onChange={(e) => setData('message', e.target.value)}
                                placeholder="Beschrijf het probleem van de klant..."
                                rows={4}
                            />
                            <InputError message={errors.message} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="status_id">Status</Label>
                                <Select
                                    value={data.status_id || defaultStatus?.id.toString() || ''}
                                    onValueChange={(value) => setData('status_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecteer status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem
                                                key={status.id}
                                                value={status.id.toString()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: status.color }}
                                                    />
                                                    {status.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="priority_id">Prioriteit</Label>
                                <Select
                                    value={data.priority_id || defaultPriority?.id.toString() || ''}
                                    onValueChange={(value) => setData('priority_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecteer prioriteit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorities.map((priority) => (
                                            <SelectItem
                                                key={priority.id}
                                                value={priority.id.toString()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: priority.color }}
                                                    />
                                                    {priority.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.priority_id} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="assigned_to">Toewijzen aan</Label>
                            <Select
                                value={data.assigned_to || 'unassigned'}
                                onValueChange={(value) => setData('assigned_to', value === 'unassigned' ? '' : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Niet toegewezen" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                                    {agents.map((agent) => (
                                        <SelectItem
                                            key={agent.id}
                                            value={agent.id.toString()}
                                        >
                                            {agent.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.assigned_to} />
                        </div>

                        {emailChannels.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="email_channel_id">Verzenden via</Label>
                                <Select
                                    value={data.email_channel_id}
                                    onValueChange={(value) => setData('email_channel_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecteer e-mailkanaal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {emailChannels.filter((c) => c.is_active).map((channel) => (
                                            <SelectItem
                                                key={channel.id}
                                                value={channel.id.toString()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>{channel.name}</span>
                                                    <span className="text-muted-foreground">
                                                        ({channel.email_address})
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.email_channel_id} />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Annuleren
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Ticket aanmaken
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
