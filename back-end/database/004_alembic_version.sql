-- Tabela de controle mantida pelo Alembic.
-- O comando `alembic upgrade head` também cria esta tabela automaticamente
-- quando ela ainda não existe. Este arquivo permite provisioná-la
-- explicitamente durante a recriação manual do banco.

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
