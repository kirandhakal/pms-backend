"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureOrganizationForTeam = ensureOrganizationForTeam;
const data_source_1 = require("../config/data-source");
const Organization_1 = require("../entities/Organization");
function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "org";
}
async function ensureOrganizationForTeam(team) {
    const orgRepo = data_source_1.AppDataSource.getRepository(Organization_1.Organization);
    let organization = await orgRepo.findOne({ where: { id: team.id } });
    if (!organization) {
        const baseSlug = slugify(team.name);
        let slug = baseSlug;
        let suffix = 1;
        while (await orgRepo.findOne({ where: { slug } })) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        organization = orgRepo.create({
            id: team.id,
            name: team.name,
            slug,
            ownerId: team.createdById,
            isActive: true,
        });
        await orgRepo.save(organization);
    }
    return organization.id;
}
