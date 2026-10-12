import { appClient } from '@/api/app-client';
// Phase A saves planning data only. It has no platform delivery worker.
export const runPublishingEngine = (..._args) => appClient.publishing.check();
