from datetime import UTC, datetime

from sqlalchemy import String, delete, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.modules.catalogs.models import ResponsibleArea
from app.modules.folders.models import Folder
from app.modules.projects.models import (
    Project,
    ProjectAccessGroup,
    ProjectFolderAccessMember,
    ProjectFolderAccessSnapshot,
    ProjectGroup,
    ProjectMember,
)
from app.modules.users.models import Profile, User


class ProjectRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, project_id: str) -> Project | None:
        return await self.session.scalar(select(Project).where(Project.id == project_id))

    async def find_by_code(self, code: str) -> Project | None:
        return await self.session.scalar(select(Project).where(Project.code == code))

    async def list_visible(self, user_id: str, role: str) -> list[Project]:
        statement = select(Project).order_by(Project.updated_at.desc())
        if role not in {"admin", "patrocinador", "auditor"}:
            statement = statement.where(
                (Project.managers_ids.cast(String).like(f"%{user_id}%"))
                | exists().where(
                    ProjectMember.project_id == Project.id, ProjectMember.user_id == user_id
                )
            )

        projects = list(await self.session.scalars(statement))
        if not projects:
            return projects

        project_ids = [project.id for project in projects]
        member_rows = await self.session.execute(
            select(ProjectMember.project_id, ProjectMember.user_id).where(
                ProjectMember.project_id.in_(project_ids)
            )
        )
        members_by_project: dict[str, list[str]] = {}
        for project_id, member_id in member_rows:
            members_by_project.setdefault(project_id, []).append(member_id)

        for project in projects:
            project.participants_ids = members_by_project.get(project.id, [])

        return projects

    async def storage_by_project_ids(self, project_ids: list[str]) -> dict[str, int]:
        if not project_ids:
            return {}
        rows = await self.session.execute(
            select(Folder.project_id, func.coalesce(func.sum(Folder.size), 0))
            .where(Folder.project_id.in_(project_ids))
            .group_by(Folder.project_id)
        )
        return {str(project_id): int(total or 0) for project_id, total in rows}

    async def effective_member_summary(
        self, project_ids: list[str]
    ) -> tuple[dict[str, int], int]:
        if not project_ids:
            return {}, 0

        sigac_rows = await self.session.execute(
            select(ProjectMember.project_id, User.id, User.user_id)
            .join(User, User.id == ProjectMember.user_id)
            .where(ProjectMember.project_id.in_(project_ids))
        )
        acl_rows = await self.session.execute(
            select(ProjectFolderAccessMember.project_id, ProjectFolderAccessMember.login)
            .where(ProjectFolderAccessMember.project_id.in_(project_ids))
        )
        snapshot_rows = await self.session.execute(
            select(ProjectFolderAccessSnapshot.project_id, ProjectFolderAccessSnapshot.payload)
            .where(ProjectFolderAccessSnapshot.project_id.in_(project_ids))
        )

        identities_by_project: dict[str, set[str]] = {}
        unique_identities: set[str] = set()
        sigac_identity_by_login: dict[str, set[str]] = {}
        for project_id, user_id, login in sigac_rows:
            project_key = str(project_id)
            identity = f"sigac:{user_id}"
            identities_by_project.setdefault(project_key, set()).add(identity)
            unique_identities.add(identity)
            normalized_login = (login or "").strip().casefold()
            if normalized_login:
                sigac_identity_by_login.setdefault(normalized_login, set()).add(identity)

        for project_id, login in acl_rows:
            project_key = str(project_id)
            normalized_login = (login or "").strip().casefold()
            if not normalized_login:
                continue
            matching_sigac_identities = sigac_identity_by_login.get(normalized_login, set())
            identity = (
                next(iter(matching_sigac_identities))
                if len(matching_sigac_identities) == 1
                else f"directory:{normalized_login}"
            )
            identities_by_project.setdefault(project_key, set()).add(identity)
            unique_identities.add(identity)

        for project_id, payload in snapshot_rows:
            project_key = str(project_id)
            entries = payload.get("entries", []) if isinstance(payload, dict) else []
            if not isinstance(entries, list):
                continue
            for entry in entries:
                if not isinstance(entry, dict) or entry.get("tipo") != "unknown":
                    continue
                sid = str(entry.get("sid") or "").strip().casefold()
                if not sid:
                    continue
                identity = f"sid:{sid}"
                identities_by_project.setdefault(project_key, set()).add(identity)
                unique_identities.add(identity)

        counts = {
            project_id: len(identities)
            for project_id, identities in identities_by_project.items()
        }
        return counts, len(unique_identities)

    async def effective_member_counts(self, project_ids: list[str]) -> dict[str, int]:
        counts, _unique_total = await self.effective_member_summary(project_ids)
        return counts

    async def can_view(self, project_id: str, user_id: str, role: str) -> bool:
        if role in {"admin", "patrocinador", "auditor"}:
            return True
        project = await self.find_by_id(project_id)
        if not project:
            return False
        if user_id in (project.managers_ids or []) or user_id in (project.participants_ids or []):
            return True
        return bool(
            await self.session.scalar(
                select(ProjectMember.project_id).where(
                    ProjectMember.project_id == project_id, ProjectMember.user_id == user_id
                )
            )
        )

    async def lock_active_area(self, name: str) -> ResponsibleArea | None:
        return await self.session.scalar(
            select(ResponsibleArea)
            .where(ResponsibleArea.name == name, ResponsibleArea.active.is_(True))
            .with_for_update()
        )

    async def list_active_areas(self) -> list[ResponsibleArea]:
        return list(
            await self.session.scalars(
                select(ResponsibleArea)
                .where(ResponsibleArea.active.is_(True))
                .order_by(ResponsibleArea.name)
            )
        )

    async def add(self, project: Project) -> Project:
        self.session.add(project)
        await self.session.flush()
        return project

    async def delete(self, project: Project) -> None:
        related_tables = [
            table
            for table in reversed(Base.metadata.sorted_tables)
            if table is not Project.__table__
            and "project_id" in table.c
            # Keep audit history; deleting the project sets this FK to NULL.
            and table.name != "activity_logs"
        ]
        for table in related_tables:
            await self.session.execute(
                delete(table).where(table.c.project_id == project.id)
            )
        await self.session.delete(project)

    async def commit(self) -> None:
        try:
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def list_users_by_ids(self, user_ids: list[str]) -> list[User]:
        if not user_ids:
            return []
        statement = (
            select(User)
            .where((User.id.in_(user_ids)) | (User.user_id.in_(user_ids)))
            .order_by(User.user_id)
        )
        return list(await self.session.scalars(statement))

    async def list_members(
        self, project_id: str
    ) -> list[tuple[ProjectMember, User, Profile | None]]:
        statement = (
            select(ProjectMember, User, Profile)
            .join(User, User.id == ProjectMember.user_id)
            .outerjoin(Profile, Profile.id == User.profile_id)
            .where(ProjectMember.project_id == project_id)
            .order_by(User.user_id)
        )
        return list((await self.session.execute(statement)).all())

    async def search_responsible_candidates(self, search: str, limit: int = 12) -> list[User]:
        normalized_search = (
            search.strip().casefold().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        term = f"%{normalized_search}%"
        statement = (
            select(User)
            .where(func.lower(User.user_id).like(term, escape="\\"))
            .order_by(User.user_id)
            .limit(limit)
        )
        return list(await self.session.scalars(statement))

    async def search_member_candidates(
        self, project_id: str, search: str, limit: int = 12
    ) -> list[tuple[User, Profile | None]]:
        normalized_search = (
            search.strip().casefold().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        term = f"%{normalized_search}%"
        statement = (
            select(User, Profile)
            .outerjoin(Profile, Profile.id == User.profile_id)
            .where(
                func.lower(User.user_id).like(term, escape="\\"),
                ~exists().where(
                    ProjectMember.project_id == project_id,
                    ProjectMember.user_id == User.id,
                ),
            )
            .order_by(User.user_id)
            .limit(limit)
        )
        return list((await self.session.execute(statement)).all())

    async def find_user_with_profile(self, user_id: str) -> tuple[User, Profile | None] | None:
        result = await self.session.execute(
            select(User, Profile)
            .outerjoin(Profile, Profile.id == User.profile_id)
            .where(User.id == user_id)
        )
        return result.one_or_none()

    async def find_member(self, project_id: str, user_id: str) -> ProjectMember | None:
        return await self.session.get(ProjectMember, (project_id, user_id))

    async def add_member(self, member: ProjectMember) -> ProjectMember:
        self.session.add(member)
        return member

    async def delete_member(self, member: ProjectMember) -> None:
        await self.session.delete(member)
        await self.session.flush()

    async def get_folder_access_snapshot(self, project_id: str) -> dict | None:
        snapshot = await self.session.get(ProjectFolderAccessSnapshot, project_id)
        if snapshot is None:
            return None

        from app.modules.projects.folder_access import folder_access_entry_key

        member_rows = await self.session.scalars(
            select(ProjectFolderAccessMember).where(
                ProjectFolderAccessMember.project_id == project_id
            )
        )
        members_by_entry: dict[str, list[dict[str, str]]] = {}
        for member in member_rows:
            members_by_entry.setdefault(member.entry_key, []).append(
                {"login": member.login, "nome": member.name, "email": member.email}
            )

        payload = dict(snapshot.payload)
        payload["entries"] = [
            {
                **entry,
                "membros": members_by_entry.get(folder_access_entry_key(entry), []),
            }
            for entry in payload.get("entries", [])
        ]
        return payload

    async def replace_folder_access_snapshot(self, project_id: str, payload: dict) -> int:
        from app.modules.projects.folder_access import folder_access_entry_key

        stored_payload = dict(payload)
        stored_entries = []
        members: list[ProjectFolderAccessMember] = []
        for entry in payload.get("entries", []):
            stored_entry = dict(entry)
            entry_members = stored_entry.pop("membros", [])
            entry_key = folder_access_entry_key(stored_entry)
            stored_entries.append(stored_entry)
            members.extend(
                ProjectFolderAccessMember(
                    project_id=project_id,
                    entry_key=entry_key,
                    login=member["login"],
                    name=member.get("nome", ""),
                    email=member.get("email", ""),
                )
                for member in entry_members
            )
        stored_payload["entries"] = stored_entries

        snapshot = await self.session.get(ProjectFolderAccessSnapshot, project_id)
        if snapshot is None:
            snapshot = ProjectFolderAccessSnapshot(
                project_id=project_id,
                payload=stored_payload,
                synced_at=datetime.now(UTC),
            )
            self.session.add(snapshot)
        else:
            snapshot.payload = stored_payload
            snapshot.synced_at = datetime.now(UTC)

        await self.session.flush()
        await self.session.execute(
            delete(ProjectFolderAccessMember).where(
                ProjectFolderAccessMember.project_id == project_id
            )
        )
        self.session.add_all(members)
        await self.commit()
        return len(members)

    async def list_access_groups(
        self, project_id: str, access_level: str | None = None
    ) -> list[tuple[ProjectGroup, ProjectAccessGroup]]:
        statement = (
            select(ProjectGroup, ProjectAccessGroup)
            .join(
                ProjectAccessGroup,
                (ProjectAccessGroup.project_id == ProjectGroup.project_id)
                & (ProjectAccessGroup.group_id == ProjectGroup.group_id),
            )
            .where(ProjectGroup.project_id == project_id)
        )
        if access_level:
            statement = statement.where(ProjectGroup.access_level == access_level)
        statement = statement.order_by(
            ProjectGroup.access_level,
            ProjectGroup.principal_type,
            ProjectGroup.group_name,
        )
        return list((await self.session.execute(statement)).all())

    async def find_access_group_by_id(
        self, project_id: str, group_id: str
    ) -> tuple[ProjectGroup, ProjectAccessGroup] | None:
        result = await self.session.execute(
            select(ProjectGroup, ProjectAccessGroup)
            .join(
                ProjectAccessGroup,
                (ProjectAccessGroup.project_id == ProjectGroup.project_id)
                & (ProjectAccessGroup.group_id == ProjectGroup.group_id),
            )
            .where(
                ProjectGroup.project_id == project_id,
                ProjectGroup.group_id == group_id,
            )
        )
        return result.one_or_none()

    async def find_catalog_group(
        self, project_id: str, principal_type: str, identifier: str
    ) -> ProjectGroup | None:
        return await self.session.scalar(
            select(ProjectGroup).where(
                ProjectGroup.project_id == project_id,
                ProjectGroup.principal_type == principal_type,
                func.lower(ProjectGroup.identifier) == identifier.strip().casefold(),
            )
        )

    async def search_catalog_groups(
        self, principal_type: str, search: str, limit: int = 12
    ) -> list[ProjectGroup]:
        term = f"%{search.strip().casefold()}%"
        statement = (
            select(ProjectGroup)
            .join(
                ProjectAccessGroup,
                (ProjectAccessGroup.project_id == ProjectGroup.project_id)
                & (ProjectAccessGroup.group_id == ProjectGroup.group_id),
            )
            .where(
                ProjectGroup.principal_type == principal_type,
                (func.lower(ProjectGroup.identifier).like(term))
                | (func.lower(ProjectGroup.group_name).like(term)),
            )
            .order_by(ProjectGroup.group_name, ProjectGroup.identifier)
            .limit(limit)
        )
        return list(await self.session.scalars(statement))

    async def add_project_group(self, group: ProjectGroup) -> ProjectGroup:
        self.session.add(group)
        await self.session.flush()
        return group

    async def add_access_group(self, group: ProjectAccessGroup) -> ProjectAccessGroup:
        self.session.add(group)
        await self.session.flush()
        return group

    async def delete_access_group(
        self, principal: ProjectGroup, association: ProjectAccessGroup
    ) -> None:
        await self.session.delete(association)
        await self.session.delete(principal)
