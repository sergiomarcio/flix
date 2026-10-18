# Oscars no Flix

Dados de vencedores e indicados: [Oscar Data, David V. Lu!!](https://github.com/DLu/oscar_data), derivado do banco da Academia e distribuído sob BSD-2-Clause (ver LICENSE.txt). A revisão exata e o último ano estão em index.json. Esta versão inclui a 98ª edição, realizada em 2026.

O índice relaciona somente filmes vencedores, por IMDb ID, às cerimônias. Os detalhes são carregados por cerimônia e mantêm as categorias históricas separadas, os nomes dos indicados, empates e indicações múltiplas do mesmo filme. Prêmios honorários associados explicitamente a um filme também são preservados. Não se usa semelhança de título para atribuir prêmios. Filmes sem IMDb ID e falhas de carregamento recebem mensagens distintas de filmes sem vitórias encontradas.

Para gerar novamente os arquivos, na raiz do projeto:

```sh
npm run data:oscars
# Para atualizar, revise primeiro os vencedores da nova versão:
npm run data:oscars -- <commit-do-repositorio-DLu/oscar_data>
```

O script usa Node.js com fetch nativo. Os JSONs são servidos como assets locais, sem nova chave de API, alteração no Supabase ou dependência de chamadas externas aos dados do Oscar durante a navegação. Apenas o índice e as cerimônias do filme são transferidos. Ao expandir uma categoria, o TMDB é consultado por IMDb ID em pt-BR para exibir “Título no Brasil (Título original)”, com cache e até quatro consultas simultâneas. Se a consulta falhar ou não houver identificação correspondente, preserva-se o nome histórico da base. A cobertura depende dos registros e identificadores existentes na fonte; uma ausência não comprova que o filme nunca ganhou um prêmio.
