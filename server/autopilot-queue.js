// Queue messages contain only routing data, never grants, filenames, prompts or media.
// runAutopilot is Durable Object RPC, not an HTTP endpoint.
export async function consumeAutopilotBatch(batch, env) {
    for (const message of batch.messages) {
        const body = message.body;
        if (env.SOCIALCHOICE_AUTOPILOT_ENABLED !== 'true' || !body || body.v !== 1 || typeof body.workspace !== 'string' || body.workspace !== 'owner' && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.workspace)) { message.ack(); continue; }
        try {
            const namespace = body.workspace === 'owner' ? env.WORKSPACE : env.CUSTOMER_WORKSPACES;
            const actor = namespace.get(namespace.idFromName(body.workspace === 'owner' ? 'single-admin-workspace' : body.workspace));
            const result = await actor.runAutopilot();
            if (result.pendingAt === null) message.ack();
            else {
                const delaySeconds = Math.max(1, Math.min(300, Math.ceil((result.pendingAt - Date.now()) / 1000)));
                if (result.result?.status === 'done' && env.AUTOPILOT_QUEUE) {
                    // A completed page starts a new delivery budget. Large scans must not exhaust retries.
                    await env.AUTOPILOT_QUEUE.send(body, { delaySeconds }); message.ack();
                } else message.retry({ delaySeconds });
            }
        } catch (error) {
            // License revocation or disabled configuration pauses durable jobs until an owner resumes them.
            if ([403, 409].includes(error.status)) message.ack();
            else message.retry({ delaySeconds: 30 });
        }
    }
}
