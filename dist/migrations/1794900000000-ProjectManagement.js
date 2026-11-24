"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectManagement1794900000000 = void 0;
class ProjectManagement1794900000000 {
    async up(q) {
        // Existing legacy teams and their projects keep the same IDs.
        await q.query(`INSERT INTO organizations (id, name, slug, "ownerId", "isActive", "createdAt", "updatedAt") SELECT t.id, t.name, 'team-' || t.id::text, t."createdById", true, t."createdAt", t."updatedAt" FROM teams t WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id=t.id) ON CONFLICT DO NOTHING`);
        await q.query(`CREATE TABLE IF NOT EXISTS project_documents (
   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
   "projectId" uuid REFERENCES projects(id) ON DELETE CASCADE, name varchar NOT NULL, "mimeType" varchar NOT NULL,
   size integer NOT NULL CHECK(size > 0), "storageKey" varchar NOT NULL, status varchar NOT NULL DEFAULT 'pending',
   roles jsonb NOT NULL DEFAULT '[]', "uploaderId" uuid NOT NULL REFERENCES users(id), "createdAt" timestamp NOT NULL DEFAULT now())`);
        await q.query(`CREATE TABLE IF NOT EXISTS project_document_links (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "documentId" uuid NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE, "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, "createdAt" timestamp NOT NULL DEFAULT now(), UNIQUE("documentId", "projectId"))`);
        await q.query(`CREATE TABLE IF NOT EXISTS organization_resources (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name varchar NOT NULL, kind varchar NOT NULL DEFAULT 'asset' CHECK(kind IN ('asset','link')), url text, "ownerId" uuid NOT NULL REFERENCES users(id), "createdAt" timestamp NOT NULL DEFAULT now())`);
        await q.query(`CREATE TABLE IF NOT EXISTS project_resource_allocations (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "resourceId" uuid NOT NULL REFERENCES organization_resources(id) ON DELETE CASCADE, "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, "startDate" date NOT NULL, "endDate" date NOT NULL, "releasedAt" timestamptz, "allocatedById" uuid NOT NULL REFERENCES users(id), "createdAt" timestamp NOT NULL DEFAULT now(), CHECK("endDate" >= "startDate"))`);
        await q.query('CREATE INDEX IF NOT EXISTS pm_documents_org ON project_documents ("organizationId")');
        await q.query('CREATE INDEX IF NOT EXISTS pm_resources_org ON organization_resources ("organizationId")');
        await q.query('CREATE INDEX IF NOT EXISTS pm_allocations_dates ON project_resource_allocations ("resourceId", "startDate", "endDate")');
    }
    async down(q) {
        for (const table of ['project_resource_allocations', 'organization_resources', 'project_document_links', 'project_documents'])
            await q.query(`DROP TABLE ${table}`);
    }
}
exports.ProjectManagement1794900000000 = ProjectManagement1794900000000;
