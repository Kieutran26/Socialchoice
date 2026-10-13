import { fail } from './validation.js';

export function createPublishingNotifications(store) {
    return {
        list() {
            const items=store.notificationRows().map(({time,updatedDate,readAt,...item})=>({...item,occurredAt:new Date(time||Date.parse(updatedDate)).toISOString(),read:readAt!=null}));
            return {items,unread:store.unreadNotificationCount()};
        },
        read(ids) {
            if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'))fail('Valid notification IDs required');
            if(ids.some(id=>!store.hasNotification(id)))fail('Notification not found',404);
            store.transaction(()=>ids.forEach(id=>store.readNotification(id)));
            return this.list();
        },
        readAll() {store.readAllNotifications();return this.list();},
    };
}
