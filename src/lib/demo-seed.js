import { appClient } from '@/api/app-client';
import { buildDemoWorkspace } from './demo-data';

/** @param {Record<string, any>} input */
const strip = ({ key, brandKey, pillarKey, angleKey, postKey, accountKey, accountName, accountKeys, mediaKeys, jobIndex, ...rest }) => rest;

/** Writes the sample workspace once. Ids from bulkCreate line up with the input order. */
export const seedDemoWorkspace = async () => {
    const data = buildDemoWorkspace();

    const brands = await appClient.entities.Brand.bulkCreate(data.brands.map(({ key, ...rest }) => strip(rest)));
    const brandId = {};
    data.brands.forEach((b, i) => {
        brandId[b.key] = brands[i].id;
    });

    const pillars = await appClient.entities.ContentPillar.bulkCreate(
        data.pillars.map((p) => ({ ...strip(p), brand_id: brandId[p.brandKey] })),
    );
    const pillarId = {};
    data.pillars.forEach((p, i) => {
        pillarId[p.key] = pillars[i].id;
    });

    const angles = await appClient.entities.ContentAngle.bulkCreate(
        data.angles.map((a) => ({
            ...strip(a),
            brand_id: brandId[a.brandKey],
            pillar_id: pillarId[a.pillarKey],
        })),
    );
    const angleId = {};
    data.angles.forEach((a, i) => {
        angleId[a.key] = angles[i].id;
    });

    const accounts = await appClient.entities.SocialAccount.bulkCreate(
        data.accounts.map((a) => ({ ...strip(a), brand_id: brandId[a.brandKey] })),
    );
    const accountId = {};
    data.accounts.forEach((a, i) => {
        accountId[a.key] = accounts[i].id;
    });

    const media = await appClient.entities.MediaAsset.bulkCreate(
        data.media.map((m) => ({ ...strip(m), brand_id: brandId[m.brandKey] })),
    );
    const mediaId = {};
    data.media.forEach((m, i) => {
        mediaId[m.key] = media[i].id;
    });

    const posts = await appClient.entities.Post.bulkCreate(
        data.posts.map((p) => ({
            ...strip(p),
            brand_id: brandId[p.brandKey],
            pillar_id: pillarId[p.pillarKey],
            angle_id: angleId[p.angleKey],
            media_ids: p.mediaKeys.map((k) => mediaId[k]).filter((id) => media.find((m) => m.id === id)?.brand_id === brandId[p.brandKey]),
            account_ids: p.accountKeys.map((k) => accountId[k]).filter(Boolean),
        })),
    );
    const postId = {};
    data.posts.forEach((p, i) => {
        postId[p.key] = posts[i].id;
    });

    const jobs = await appClient.entities.PublishJob.bulkCreate(
        data.jobs.map((j) => ({
            ...strip(j),
            post_id: postId[j.postKey],
            brand_id: brandId[j.brandKey],
            social_account_id: accountId[j.accountKey],
            account_name: j.accountName,
        })),
    );

    await appClient.entities.PublishingLog.bulkCreate(
        data.logs.map((l) => ({
            ...strip(l),
            post_id: postId[l.postKey],
            publish_job_id: jobs[l.jobIndex]?.id || '',
        })),
    );

    return posts.length;
};

/** Removes every sample record — never touches live workspace data. */
export const clearDemoWorkspace = async () => {
    const query = { is_demo: true };
    await appClient.entities.PublishingLog.deleteMany(query);
    await appClient.entities.PublishJob.deleteMany(query);
    await appClient.entities.PostVariant.deleteMany(query);
    const posts = await appClient.entities.Post.filter(query, { limit: 1000 });
    for (const post of posts.items) {
        await appClient.entities.Post.update(post.id, { status: 'draft' });
        await appClient.entities.Post.delete(post.id);
    }
    await appClient.entities.MediaAsset.deleteMany(query);
    await appClient.entities.ContentAngle.deleteMany(query);
    await appClient.entities.ContentPillar.deleteMany(query);
    await appClient.entities.SocialAccount.deleteMany(query);
    await appClient.entities.Brand.deleteMany(query);
};
