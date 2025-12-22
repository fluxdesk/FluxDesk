import * as React from 'react';
import { router } from '@inertiajs/react';
import { Bell, AtSign, UserPlus, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { AppNotification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface NotificationDropdownProps {
    isCollapsed?: boolean;
}

export function NotificationDropdown({ isCollapsed = false }: NotificationDropdownProps) {
    const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    // Fetch notifications
    const fetchNotifications = React.useCallback(async () => {
        try {
            const response = await fetch('/notifications', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unread_count);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    // Fetch on mount and when dropdown opens
    React.useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Poll for new notifications every 30 seconds
    React.useEffect(() => {
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Refetch when dropdown opens
    React.useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    // Mark single notification as read and navigate
    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.read_at) {
            try {
                await fetch(`/notifications/${notification.id}/read`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    credentials: 'same-origin',
                });
                setUnreadCount((prev) => Math.max(0, prev - 1));
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id
                            ? { ...n, read_at: new Date().toISOString() }
                            : n
                    )
                );
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }

        // Navigate to ticket
        setIsOpen(false);
        router.visit(`/inbox/${notification.data.ticket_id}`);
    };

    // Mark all as read
    const handleMarkAllAsRead = async () => {
        setIsLoading(true);
        try {
            await fetch('/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'same-origin',
            });
            setUnreadCount(0);
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get icon based on notification type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'mention':
                return <AtSign className="h-4 w-4 text-yellow-500" />;
            case 'assignment':
                return <UserPlus className="h-4 w-4 text-blue-500" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    // Get notification text
    const getNotificationText = (notification: AppNotification) => {
        const { data } = notification;
        switch (data.type) {
            case 'mention':
                return (
                    <>
                        <span className="font-medium">{data.mentioned_by_name}</span>
                        {' heeft je vermeld in '}
                        <span className="font-medium">#{data.ticket_number}</span>
                    </>
                );
            case 'assignment':
                return (
                    <>
                        <span className="font-medium">#{data.ticket_number}</span>
                        {' is aan jou toegewezen'}
                        {data.assigned_by_name && (
                            <> door <span className="font-medium">{data.assigned_by_name}</span></>
                        )}
                    </>
                );
            default:
                return data.ticket_subject;
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size={isCollapsed ? 'icon' : 'default'}
                    className={cn(
                        'relative',
                        isCollapsed ? 'h-9 w-9' : 'w-full justify-start gap-2'
                    )}
                >
                    <Bell className="h-4 w-4" />
                    {!isCollapsed && <span>Meldingen</span>}
                    {unreadCount > 0 && (
                        <span className={cn(
                            'flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground',
                            isCollapsed ? 'absolute -right-0.5 -top-0.5' : 'ml-auto'
                        )}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={isCollapsed ? 'center' : 'start'}
                side={isCollapsed ? 'right' : 'bottom'}
                className="w-80"
            >
                <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-semibold">Meldingen</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs"
                            onClick={handleMarkAllAsRead}
                            disabled={isLoading}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Alles gelezen
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            Geen meldingen
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    'flex cursor-pointer items-start gap-3 px-3 py-3',
                                    !notification.read_at && 'bg-accent/30'
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {getNotificationIcon(notification.data.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-tight">
                                        {getNotificationText(notification)}
                                    </p>
                                    {notification.data.message_preview && (
                                        <p className="mt-1 truncate text-xs text-muted-foreground">
                                            {notification.data.message_preview}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(notification.created_at), {
                                            addSuffix: true,
                                            locale: nl,
                                        })}
                                    </p>
                                </div>
                                {!notification.read_at && (
                                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
