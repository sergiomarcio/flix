import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ManualSection {
  id: string;
  icon: string;
  title: string;
  items: ManualItem[];
}

interface ManualItem {
  title: string;
  desc: string;
  tips?: string[];
}

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './manual.component.html',
  styleUrl: './manual.component.scss'
})
export class ManualComponent {
  activeSection: string | null = null;

  sections: ManualSection[] = [
    {
      id: 'filmes',
      icon: '🎬',
      title: 'Filmes',
      items: [
        {
          title: 'Explorar Filmes',
          desc: 'A tela inicial de Filmes exibe um banner hero com os filmes em tendência, que troca automaticamente a cada 5 segundos. Clique nos pontos indicadores para navegar entre eles manualmente.',
          tips: [
            'Use a barra de pesquisa para buscar qualquer filme por título — a pesquisa é feita automaticamente enquanto você digita.',
            'Nos resultados da pesquisa, clique em "Carregar Mais" para ver mais filmes sem sair da página.',
            'Clique em qualquer filme para ver todos os seus detalhes.'
          ]
        },
        {
          title: 'Populares, Mais Votados e Em Cartaz',
          desc: 'Listas curadas de filmes separadas por categoria. Cada lista exibe os filmes em grade com poster, nota e status da sua coleção.',
          tips: [
            'Clique em "Carregar Mais" para adicionar mais filmes à lista sem recarregar a página.',
            'Se você clicar em um filme e depois voltar, a lista estará exatamente onde você parou — com os mesmos filmes carregados e na mesma posição de scroll.'
          ]
        },
        {
          title: 'Detalhe do Filme',
          desc: 'Página completa com todas as informações do filme: sinopse, elenco, diretor, roteiristas, fotos, trailer, onde assistir no Brasil e filmes similares.',
          tips: [
            'Marque o filme como "Quero Ver" ou "Vi" usando os botões de status.',
            'Após marcar como "Vi", avalie o filme com 👍 Gostei, 😐 Mais ou Menos ou 👎 Não Gostei.',
            'Clique em "Assistir Trailer" para abrir o trailer do YouTube diretamente na página.',
            'Veja onde o filme está disponível para streaming, aluguel ou compra no Brasil.',
            'Deixe comentários com texto, emojis e GIFs. Você pode editar ou apagar seus próprios comentários.',
            'Clique no nome de um ator ou membro da equipe para ver o perfil completo dessa pessoa.',
            'Use o botão "← Voltar" para retornar à tela anterior.'
          ]
        },
        {
          title: 'Minha Lista de Filmes',
          desc: 'Todos os filmes que você marcou como "Vi" ou "Quero Ver" aparecem aqui organizados.',
          tips: [
            'Filtre a lista por status: Todos, Vi ou Quero Ver.',
            'Ordene por título (A–Z ou Z–A) ou por ano de lançamento.',
            'Clique no filme para ver o detalhe.',
            'Clique no ícone de lixeira para remover o filme da sua lista.'
          ]
        },
        {
          title: 'Estatísticas de Filmes',
          desc: 'Painel com métricas do seu histórico de filmes assistidos: total de horas na tela, quantidades por avaliação e lista detalhada.',
          tips: [
            'Veja o total de tempo gasto assistindo filmes convertido em horas e minutos.',
            'Filtre a lista de filmes por avaliação: Gostei, Mais ou Menos, Não Gostei ou Sem Avaliação.',
            'Ordene os filmes por título ou ano dentro de cada filtro.'
          ]
        }
      ]
    },
    {
      id: 'series',
      icon: '📺',
      title: 'Séries',
      items: [
        {
          title: 'Explorar Séries',
          desc: 'Igual ao Explorar de Filmes, mas para séries. Banner hero com tendências rotativas e barra de pesquisa em tempo real.',
          tips: [
            'As séries que já estão na sua lista aparecem com um badge de status (Assistindo, Concluída, Quero Ver).',
            'Pesquise qualquer série pelo título e navegue pelos resultados.'
          ]
        },
        {
          title: 'Populares e Mais Votadas',
          desc: 'Listas de séries por categoria com grade de posters, notas e badges de status da sua coleção.',
          tips: [
            'Clique em "Carregar Mais" para carregar mais séries na mesma lista.',
            'Ao clicar em uma série e depois pressionar "← Voltar" no detalhe, você retorna exatamente ao mesmo ponto da lista — com todos os itens carregados e o scroll no mesmo lugar.'
          ]
        },
        {
          title: 'Detalhe da Série',
          desc: 'Página completa da série com sinopse, elenco, fotos, trailer, onde assistir e todas as temporadas com progresso de episódios.',
          tips: [
            'Marque a série como "Quero Ver", "Assistindo" ou "Concluída".',
            'Cada temporada exibe uma barra de progresso mostrando quantos episódios você já assistiu.',
            'Clique em uma temporada para abrir o detalhe completo com todos os episódios.',
            'Marque episódios individuais como assistidos diretamente nessa tela, usando os botões rápidos.',
            'Veja onde a série está disponível no Brasil para streaming, aluguel ou compra.',
            'Clique em "← Voltar" para retornar à lista ou à tela anterior.'
          ]
        },
        {
          title: 'Detalhe da Temporada',
          desc: 'Lista todos os episódios de uma temporada com datas de exibição, sinopse e opção de marcar como assistido.',
          tips: [
            'Clique no botão de check em cada episódio para marcá-lo como assistido ou não assistido.',
            'Clique no título ou na imagem de um episódio para abrir o modal com todos os detalhes.',
            'Use "Marcar todos" para marcar toda a temporada de uma vez.'
          ]
        },
        {
          title: 'Modal do Episódio',
          desc: 'Abre ao clicar em um episódio na tela da temporada. Exibe detalhes completos: elenco, diretor, roteiristas, fotos de cena e comentários.',
          tips: [
            'Marque o episódio como assistido direto pelo modal.',
            'Deixe comentários com texto, emojis e GIFs sobre o episódio.',
            'Você pode editar ou excluir seus comentários.',
            'Clique fora do modal ou no botão X para fechar.'
          ]
        },
        {
          title: 'Minha Lista de Séries',
          desc: 'Todas as séries da sua coleção, organizadas com status e número de temporadas.',
          tips: [
            'Filtre por status: Todas, Assistindo, Concluída ou Quero Ver.',
            'Ordene por título ou ano de estreia.',
            'Clique na série para abrir o detalhe completo.'
          ]
        },
        {
          title: 'Estatísticas de Séries',
          desc: 'Painel com o total de episódios assistidos, tempo acumulado e progresso por série.',
          tips: [
            'Veja o total de horas assistidas em séries.',
            'Filtre por status para focar em séries que está assistindo, já concluiu ou quer assistir.',
            'Ao clicar em uma série nas estatísticas e depois voltar, o filtro e a ordenação são preservados.',
            'Ordene por título ou ano dentro de cada filtro.'
          ]
        }
      ]
    },
    {
      id: 'pessoas',
      icon: '🎭',
      title: 'Pessoas',
      items: [
        {
          title: 'Buscar Pessoas',
          desc: 'Pesquise atores, diretores, roteiristas, produtores e demais profissionais do cinema e da televisão.',
          tips: [
            'Digite o nome da pessoa na barra de pesquisa — os resultados aparecem automaticamente.',
            'Filtre os resultados por departamento: Ator/Atriz, Diretor, Roteirista ou Produtor.',
            'Clique em "Carregar Mais" para ver mais resultados.',
            'Ao clicar em uma pessoa e voltar, sua pesquisa e os resultados são preservados exatamente como estavam.'
          ]
        },
        {
          title: 'Perfil da Pessoa',
          desc: 'Página completa com biografia, data de nascimento, local de nascimento e toda a filmografia do profissional.',
          tips: [
            'Veja os filmes e séries em que a pessoa participou, com poster e ano.',
            'Clique em qualquer título da filmografia para ir diretamente ao detalhe do filme ou da série.',
            'Use "← Voltar" para retornar à busca de pessoas.'
          ]
        }
      ]
    },
    {
      id: 'navegacao',
      icon: '🧭',
      title: 'Navegação',
      items: [
        {
          title: 'Menu Desktop',
          desc: 'No computador, a barra de navegação no topo exibe todos os módulos organizados por seção: Filmes, Séries, Pessoas e itens gerais.',
          tips: [
            'Os links ativos ficam destacados em dourado.',
            'Os botões "Minha Lista" e "Estatísticas" têm estilo visual diferenciado para fácil identificação.',
            'Seu e-mail aparece no canto direito, dividido em usuário e domínio.',
            'Clique em "Sair" para encerrar a sessão.'
          ]
        },
        {
          title: 'Menu Mobile',
          desc: 'Em telas menores, a navegação é acessada pelo botão de menu (☰) no canto superior direito, que abre um painel lateral.',
          tips: [
            'O painel lateral exibe seu avatar com a inicial do e-mail, nome de usuário e domínio.',
            'Todos os itens de navegação ficam organizados em seções com ícones.',
            'Toque fora do painel ou no botão X para fechá-lo.',
            'O botão "Sair" fica ao fundo do painel.'
          ]
        }
      ]
    }
  ];

  toggle(id: string): void {
    this.activeSection = this.activeSection === id ? null : id;
  }

  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeSection = id;
  }
}
