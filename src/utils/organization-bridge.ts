import { AppDataSource } from "../config/data-source";
import { Organization } from "../entities/Organization";
import { Team } from "../entities/Team";

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "org";
}

export async function ensureOrganizationForTeam(team: Team): Promise<string> {
    const orgRepo = AppDataSource.getRepository(Organization);
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
