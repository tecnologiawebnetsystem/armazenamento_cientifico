"""Garante que o banco SQLite tenha todas as tabelas do modelo ORM.

A revisão 0001 é apenas uma baseline histórica e não cria tabelas. Esta revisão
fecha essa lacuna para bancos novos e bancos legados parcialmente inicializados.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "0011_bootstrap_orm_schema"
down_revision = "0010_report_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.db.base import Base
    from app.modules.audit import models as _audit_models
    from app.modules.catalogs import models as _catalog_models
    from app.modules.files import models as _file_models
    from app.modules.projects import member_model as _member_models
    from app.modules.projects import models as _project_models
    from app.modules.users import models as _user_models
    from app.modules.users import profile_model as _profile_models

    # Importações acima registram todos os modelos no metadata antes da criação.
    del _audit_models, _catalog_models, _file_models, _member_models
    del _project_models, _user_models, _profile_models
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    # Esta revisão é um reparo de compatibilidade; não remove dados nem tabelas
    # criadas por revisões anteriores.
    pass
