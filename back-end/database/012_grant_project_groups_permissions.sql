-- Concede ao runtime da aplicação acesso às tabelas usadas pelo Mapa de Acessos.
-- Executar conectado ao banco com uma role autorizada a conceder esses privilégios.

GRANT USAGE ON SCHEMA a25034 TO "a25034d_aplicacao";

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE a25034.project_groups
    TO "a25034d_aplicacao";

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE a25034.project_access_groups
    TO "a25034d_aplicacao";
