from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.folders.models import Folder


class FolderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, folder_id: str) -> Folder | None:
        return await self.session.scalar(select(Folder).where(Folder.id == folder_id))

    async def find_by_project(self, project_id: str) -> list[Folder]:
        result = await self.session.scalars(
            select(Folder)
            .where(Folder.project_id == project_id, Folder.kind.in_(("pasta", "folder")))
            .order_by(Folder.name)
        )
        return list(result)

    async def project_exists(self, project_id: str) -> bool:
        from app.modules.projects.models import Project
        return await self.session.scalar(select(Project.id).where(Project.id == project_id)) is not None

    async def find_user_database_id(self, identifiers: list[str]) -> str | None:
        """Resolve o ID técnico exigido pela FK folders.created_by."""
        from app.modules.users.models import User

        values = tuple(dict.fromkeys(value.strip() for value in identifiers if value and value.strip()))
        if not values:
            return None
        return await self.session.scalar(select(User.id).where(User.user_id.in_(values)).limit(1))

    async def find_project(self, project_id: str):
        from app.modules.projects.models import Project
        return await self.session.scalar(select(Project).where(Project.id == project_id))

    async def can_view_project(self, project_id: str, user_id: str, role: str) -> bool:
        from app.modules.projects.repository import ProjectRepository
        return await ProjectRepository(self.session).can_view(project_id, user_id, role)

    # TODO(verificar com a equipe de devs): sem referências no repositório (varredura de 2026-10-14);
    # comentado em vez de excluído.
    # async def find_by_path(self, project_id: str, path: str) -> Folder | None:
    #     return await self.session.scalar(
    #         select(Folder).where(
    #             Folder.project_id == project_id, Folder.name == path
    #         )
    #     )

    async def list_by_parent(self, parent_id: str) -> list[Folder]:
        result = await self.session.scalars(
            select(Folder).where(Folder.parent_id == parent_id).order_by(Folder.name)
        )
        return list(result)

    async def create(self, folder: Folder) -> Folder:
        self.session.add(folder)
        await self.session.flush()
        return folder

    async def create_many(self, folders: list[Folder]) -> list[Folder]:
        self.session.add_all(folders)
        await self.session.flush()
        await self.session.commit()
        return folders

    async def reconcile(self, folders: list[Folder], source_folders: list[dict], updated_at) -> int:
        by_id = {str(item.get("id")): item for item in source_folders if item.get("id")}
        by_name = {str(item.get("name", "")).strip().casefold(): item for item in source_folders if item.get("name")}
        updated = 0
        for folder in folders:
            source = by_id.get(str(folder.id)) or by_name.get(folder.name.strip().casefold())
            if not source:
                continue
            folder.size = int(source.get("size_bytes") or 0)
            folder.updated_at = updated_at
            updated += 1
        if updated:
            await self.session.flush()
            await self.session.commit()
        return updated

    async def update(self, folder: Folder) -> Folder:
        await self.session.merge(folder)
        await self.session.flush()
        return folder

    async def delete(self, folder_id: str) -> bool:
        folder = await self.find_by_id(folder_id)
        if folder:
            await self.session.delete(folder)
            await self.session.flush()
            return True
        return False

    async def upsert_access_groups(self, project_id: str, groups: list[dict]) -> dict[str, int]:
        """Insere ou atualiza project_groups + project_access_groups com upsert.

        Retorna contadores: inserted, updated, skipped.
        """
        from app.modules.projects.models import ProjectAccessGroup, ProjectGroup

        if not groups:
            return {"inserted": 0, "updated": 0, "skipped": 0}

        inserted = 0
        updated = 0
        skipped = 0

        for item in groups:
            group_stmt = pg_insert(ProjectGroup).values(
                group_id=item["group_id"],
                project_id=project_id,
                identifier=item["identifier"],
                group_name=item["group_name"],
                principal_type=item["principal_type"],
                access_level=item["access_level"],
                source=item.get("source", "rede"),
            )
            group_stmt = group_stmt.on_conflict_do_update(
                constraint="uq_project_groups_project_type_identifier",
                set_={
                    "group_name": group_stmt.excluded.group_name,
                    "access_level": group_stmt.excluded.access_level,
                    "source": group_stmt.excluded.source,
                    "updated_at": group_stmt.excluded.updated_at,
                },
                where=(ProjectGroup.source == "rede"),
            )
            group_stmt = group_stmt.returning(ProjectGroup.group_id)
            result = await self.session.execute(group_stmt)
            persisted_group_id = result.scalar_one_or_none()
            if result.rowcount and result.rowcount > 0:
                inserted += 1
            else:
                skipped += 1

            # Um conflito de identificador pode manter um group_id antigo, sobretudo
            # para grupos manuais. O vínculo deve usar sempre o ID realmente persistido.
            if persisted_group_id is None:
                persisted_group_id = await self.session.scalar(
                    select(ProjectGroup.group_id).where(
                        ProjectGroup.project_id == project_id,
                        ProjectGroup.principal_type == item["principal_type"],
                        ProjectGroup.identifier == item["identifier"],
                    )
                )
            if persisted_group_id is None:
                continue

            link_stmt = pg_insert(ProjectAccessGroup).values(
                project_id=project_id,
                group_id=persisted_group_id,
            ).on_conflict_do_nothing()
            await self.session.execute(link_stmt)

        await self.session.commit()
        return {"inserted": inserted, "updated": updated, "skipped": skipped}
