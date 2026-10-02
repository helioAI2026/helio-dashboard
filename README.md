# Helio — Painel da Frota

Dashboard de operações do **Helio**, um ADAS (sistema avançado de assistência ao condutor)
que detecta fadiga do motorista. Um dispositivo de borda com câmera infravermelha roda um
modelo de ML embarcado que acompanha marcos faciais e, junto com outras medidas, gera uma
pontuação de sonolência (0–100). O alvo são frotas de caminhões mais antigos: barato de
instalar, protege transportadora e motorista em caso de acidente. O retreinamento é em
ciclo fechado via **AWS Greengrass** — o dispositivo acumula quadros localmente, envia
quando há conexão, o Greengrass retreina e a nova versão é baixada e implantada
automaticamente.

Toda a interface é em **português (pt-BR)**.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Build | Vite 6 + React 19 + TypeScript (strict) |
| Rotas | React Router v7 (data router) |
| Estado de servidor | TanStack Query v5 |
| API simulada | MSW v2 + `@faker-js/faker` (dados semente determinísticos) |
| UI | Tailwind CSS v4 + componentes shadcn/ui (Radix) |
| Mapa | MapLibre GL + `react-map-gl` sobre basemap escuro da CARTO (sem chave de API) |
| Gráficos | Recharts (séries) + SVG próprio (sparklines, medidor) |
| Testes | Vitest + Testing Library |

## Como rodar

```bash
npm install
npm run dev            # http://localhost:5173
```

Faça login com **qualquer e-mail e senha** (autenticação é simulada). A aplicação sobe com
dados simulados e uma **simulação ao vivo**: a cada 4 s os caminhões se movem, as
pontuações de fadiga oscilam, novos alertas surgem e os treinamentos do Greengrass avançam.

| Script | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (`tsc -b && vite build`) |
| `npm run preview` | Servir o build |
| `npm run test` | Testes (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Telas

- **`/` Visão geral** — KPIs da frota, tendência de fadiga em 24 h, distribuição por nível,
  alertas ativos, saúde dos dispositivos, mini-mapa.
- **`/mapa` Mapa da frota** — MapLibre com marcadores por nível de fadiga, agrupamento e
  painel de detalhes do veículo (placa, modelo, motorista, dispositivo, firmware, modelo
  implantado, velocidade, direção).
- **`/alertas` Alertas** — tabela filtrável e paginada; o detalhe mostra o quadro em
  infravermelho com sobreposição de marcos faciais, gatilhos e ação de reconhecimento.
- **`/motoristas`** e **`/motoristas/:id`** — lista e histórico por motorista.
- **`/dispositivos`** e **`/dispositivos/:id`** — unidades de borda, conectividade, buffer
  do Greengrass, modelo implantado, forçar sincronização.
- **`/ml/modelos`**, **`/ml/treinamentos`**, **`/ml/implantacao`** — versões do modelo,
  pipeline de treinamento do Greengrass e implantação gradual.
- **`/configuracoes`** — limiares de fadiga (com validação), regras de notificação,
  usuários.
- **`/_galeria`** — galeria de componentes (apenas em desenvolvimento).

## Arquitetura da camada de dados (a "costura")

A UI conversa com rotas `/api/*` através de `src/api/client.ts` e dos hooks em
`src/api/queries.ts`. Hoje essas rotas são atendidas pelo MSW (`src/api/mock/`); um backend
real que exponha os mesmos caminhos substitui o mock sem tocar nos componentes.

```
src/api/
  types.ts              modelo de domínio (o contrato)
  client.ts             wrappers de fetch  ← troque aqui para um backend real
  queries.ts            hooks do TanStack Query
  mock/
    seed.ts             geração determinística dos dados
    db.ts               store em memória + consultas
    handlers.ts         handlers MSW de cada rota
    live.ts             simulação ao vivo (move veículos, gera alertas, avança treinos)
    frames.ts           SVGs de quadro IR + marcos faciais
```

## Tema

Escuro por padrão (`<html class="dark">`), com tema claro completo. Alterne pelo botão na
barra superior. Os tokens ficam em `src/styles/globals.css`; as cores semânticas de fadiga
(`--severity-alert|mild|drowsy|critical`) são a única paleta que carrega significado — o
azul-aço é reservado para elementos interativos.

## Dependências externas em tempo de execução

A única chamada externa da aplicação é o basemap do mapa
(`basemaps.cartocdn.com`, gratuito, com atribuição). Todo o resto é empacotado. Para uso
sem internet, aponte `BASEMAP_STYLE` em `src/components/map/FleetMap.tsx` para tiles
próprios.
