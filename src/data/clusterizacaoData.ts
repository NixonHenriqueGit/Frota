export type ClusterizacaoModalKey = 'caminhoes' | 'puxada' | 'empilhadeira';

export type ClusterizacaoClassification = 'SEGURANÇA' | 'QUALIDADE';

export type ClusterizacaoLevel =
  | 'BLOQUEIO IMEDIATO'
  | 'GRAVE'
  | 'MÉDIO'
  | 'LEVE';

export interface ClusterizacaoRule {
  id: string;
  modal: ClusterizacaoModalKey;
  macro: string;
  micro: string;
  classification: ClusterizacaoClassification;
  level: ClusterizacaoLevel;
  explanation: string;
}

export interface ClusterizacaoModalMeta {
  key: ClusterizacaoModalKey;
  label: string;
  shortLabel: string;
  subtitle: string;
  showMacroColumn: boolean;
}

export const CLUSTERIZACAO_MODALS: ClusterizacaoModalMeta[] = [
  {
    key: 'caminhoes',
    label: 'Caminhões (Entrega)',
    shortLabel: 'Caminhões',
    subtitle: 'Cabine, Frontal, Baú, Traseira, Pneus e Itens Extras',
    showMacroColumn: true,
  },
  {
    key: 'puxada',
    label: 'Puxada',
    shortLabel: 'Puxada',
    subtitle: 'Cabine, Frontal, Sider, Traseira, Pneus e Itens Extras',
    showMacroColumn: true,
  },
  {
    key: 'empilhadeira',
    label: 'Empilhadeira',
    shortLabel: 'Empilhadeira',
    subtitle: 'Segurança, Torre/Hidráulica, Sinalização, Pneus/Rodas, Visual/5S e Itens Extras',
    showMacroColumn: false,
  },
];

type RawRuleTuple = [
  macro: string,
  micro: string,
  classification: ClusterizacaoClassification,
  level: ClusterizacaoLevel,
  explanation: string,
];

function buildRules(
  modal: ClusterizacaoModalKey,
  tuples: RawRuleTuple[]
): ClusterizacaoRule[] {
  return tuples.map(([macro, micro, classification, level, explanation], idx) => ({
    id: `${modal}-${idx + 1}`,
    modal,
    macro,
    micro,
    classification,
    level,
    explanation,
  }));
}

const CABINE_SHARED: RawRuleTuple[] = [
  ['Cabine', 'Documentos Obrigatórios', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Documentação ausente ou vencida'],
  ['Cabine', '5S', 'QUALIDADE', 'LEVE', 'Cabine e bancos manchados, porém limpos'],
  ['Cabine', '5S', 'QUALIDADE', 'MÉDIO', 'Cabine e bancos com sujeira aparente indicando falta de higiene e organização'],
  ['Cabine', 'Forro de Teto', 'QUALIDADE', 'LEVE', 'Forro de teto manchado, porém limpos'],
  ['Cabine', 'Forro de Teto', 'QUALIDADE', 'MÉDIO', 'Forro de teto com sujeira aparente indicando falta de higiene e ou avariado/solto/faltando partes'],
  ['Cabine', 'Manopla', 'QUALIDADE', 'LEVE', 'Manopla com aparência desgastada e/ou coifa rasgada'],
  ['Cabine', 'Manopla', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Manopla ausente apenas no ferro e/ou avariada de forma a impedir o correto manuseio'],
  ['Cabine', 'Volante', 'QUALIDADE', 'LEVE', 'Volante descascando, desgastado, rasgado de modo a não afetar a segurança da equipe de entrega'],
  ['Cabine', 'Volante', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Volante com folga, quebrado, solto e/ou desgastado de forma a afetar a segurança da equipe de entrega'],
  ['Cabine', 'Buzina', 'SEGURANÇA', 'GRAVE', 'Buzina falhando, som baixo ou ausente'],
  ['Cabine', 'Extintor', 'SEGURANÇA', 'GRAVE', 'Extintor despressurizado, vencido, ausente'],
  ['Cabine', 'Proteção contra sol e temperaturas', 'SEGURANÇA', 'LEVE', 'Ausência e/ou avarias'],
  ['Cabine', 'Sensor de Cinto', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Sensor sonoro inexistente ou danificado'],
  ['Cabine', 'Cinto de segurança', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausência, avarias e/ou desgaste'],
  ['Cabine', 'Painéis (Frontal e de portas)', 'QUALIDADE', 'LEVE', 'Sujo, arranhado e/ou manchado'],
  ['Cabine', 'Painéis (Frontal e de portas)', 'QUALIDADE', 'MÉDIO', 'Grandes avarias, ausência de tampas e porta luvas e/ou caixa de fusíveis'],
  ['Cabine', 'Painéis (Frontal e de portas)', 'SEGURANÇA', 'MÉDIO', 'Fiação eletrificada exposta'],
  ['Cabine', 'Maçanetas e Fechamento de portas', 'SEGURANÇA', 'MÉDIO', 'Maçaneta avariada e/ou solta'],
  ['Cabine', 'Maçanetas e Fechamento de portas', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Porta não fechar ou não trancar'],
  ['Cabine', 'Estrutura do Banco', 'QUALIDADE', 'MÉDIO', 'Rasgado, descosturado, quebrado e/ou sem estofado'],
  ['Cabine', 'Lado Externo', 'QUALIDADE', 'LEVE', 'Pequenas avarias na cabine, e/ou ausência de carenagem etc.'],
  ['Cabine', 'Lado Externo', 'QUALIDADE', 'GRAVE', 'Portas e/ou lateral da cabine amassada indicando colisão'],
  ['Cabine', 'Pontos de Apoio Acesso à Cabine', 'SEGURANÇA', 'GRAVE', 'Antiderrapante ausente e/ou avariado/desgastado'],
  ['Cabine', 'Pontos de Apoio Acesso à Cabine', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Escada e/ou pontos de apoio ausente e/ou solto'],
];

const FRONTAL_SHARED: RawRuleTuple[] = [
  ['Frontal', 'Farol', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Farol queimado, problemas elétricos, e/ou ausente mesmo que seja em apenas um'],
  ['Frontal', 'Farol', 'QUALIDADE', 'LEVE', 'Lente trincada, mas farol funciona'],
  ['Frontal', 'Farol', 'QUALIDADE', 'GRAVE', 'Lente quebrada que indique colisão, mas farol funciona'],
  ['Frontal', 'Pisca Dianteiro e Auxiliar', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pisca e/ou pisca auxiliar queimado, problemas elétricos, ausente mesmo que seja em apenas um'],
  ['Frontal', 'Pisca Dianteiro e Auxiliar', 'QUALIDADE', 'LEVE', 'Lente trincada, mas farol funciona'],
  ['Frontal', 'Pisca Dianteiro e Auxiliar', 'QUALIDADE', 'GRAVE', 'Lente quebrada que indique colisão, mas farol funciona'],
  ['Frontal', 'Para-choque dianteiro', 'QUALIDADE', 'LEVE', 'Avaria leve e pequenos arranhões'],
  ['Frontal', 'Para-choque dianteiro', 'QUALIDADE', 'GRAVE', 'Ausente, fixado com gambiarras, grandes avarias que indique colisão'],
  ['Frontal', 'Limpador', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Não acionamento do jato de água, falta de água, não acionamento das palhetas, borrachas desgastadas, mangueira não conectada'],
  ['Frontal', 'Vidros frontais e laterais', 'SEGURANÇA', 'GRAVE', 'Pequenas trincas nos vidros laterais'],
  ['Frontal', 'Vidros frontais e laterais', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Trincas maiores em vidro laterais e/ou qualquer avaria no para-brisas'],
  ['Frontal', 'Placa do veículo', 'SEGURANÇA', 'GRAVE', 'Avarias, desgaste que não impeça a visualização'],
  ['Frontal', 'Placa do veículo', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausência, desgaste impossibilitando visualização completa dos dados, fixação fora do padrão'],
  ['Frontal', 'Código de identificação do veículo', 'QUALIDADE', 'LEVE', 'Ausência e/ou desgaste visual'],
  ['Frontal', 'Adesivos e Identificações de Trânsito Obrigatória', 'SEGURANÇA', 'MÉDIO', 'Ausência dos adesivos ou avarias que impeçam a visualização'],
  ['Frontal', 'Retrovisores', 'SEGURANÇA', 'GRAVE', 'Braço ou estrutura avariada, espelho com pequenas avarias'],
  ['Frontal', 'Retrovisores', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Espelho quebrado de forma a prejudicar a visualização, ausência e/ou braço quebrado'],
];

const TRASEIRA_SHARED_BASE: RawRuleTuple[] = [
  ['Traseira', 'Para-choque traseiro', 'QUALIDADE', 'LEVE', 'Avaria leve e pequenos arranhões'],
  ['Traseira', 'Para-choque traseiro', 'QUALIDADE', 'GRAVE', 'Ausente, fixado com gambiarras, grandes avarias que indique colisão'],
  ['Traseira', 'Farol Traseiro', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Farol queimado, problemas elétricos, ausente mesmo que seja em apenas um'],
  ['Traseira', 'Farol Traseiro', 'QUALIDADE', 'LEVE', 'Lente trincada, mas farol funciona'],
  ['Traseira', 'Farol Traseiro', 'QUALIDADE', 'GRAVE', 'Lente quebrada que indique colisão, mas farol funciona'],
  ['Traseira', 'Luz de Ré e Sinal Sonoro de Ré', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Luz queimada mesmo que seja apenas uma, quebrados sem funcionar, sem sinal sonoro de ré e/ou sinal sonoro de ré baixo'],
  ['Traseira', 'Luz de Ré e Sinal Sonoro de Ré', 'QUALIDADE', 'LEVE', 'Lente trincada, mas luz funciona'],
  ['Traseira', 'Luz de Ré e Sinal Sonoro de Ré', 'QUALIDADE', 'GRAVE', 'Lente quebrada que indique colisão, mas a luz funciona'],
  ['Traseira', 'Luz de Freio', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Luz de freio queimada, problemas elétricos, ausente mesmo que seja em apenas um'],
  ['Traseira', 'Luz de Freio', 'QUALIDADE', 'LEVE', 'Lente trincada, mas luz funciona'],
  ['Traseira', 'Luz de Freio', 'QUALIDADE', 'GRAVE', 'Lente quebrada que indique colisão, mas a luz funciona'],
  ['Traseira', 'Pisca Traseiro', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pisca e/ou pisca auxiliar queimado, problemas elétricos, ausente mesmo que seja em apenas um'],
  ['Traseira', 'Pisca Traseiro', 'QUALIDADE', 'LEVE', 'Lente trincada, mas luz funciona'],
  ['Traseira', 'Pisca Traseiro', 'QUALIDADE', 'GRAVE', 'Lente quebrada que indique colisão, mas luz funciona'],
  ['Traseira', 'Placa Traseira do Veículo', 'SEGURANÇA', 'GRAVE', 'Avarias, desgaste que não impeça a visualização'],
  ['Traseira', 'Placa Traseira do Veículo', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausência, desgaste impossibilitando visualização completa dos dados e/ou fixação fora do padrão'],
  ['Traseira', 'Código de identificação do veículo', 'QUALIDADE', 'LEVE', 'Ausência e/ou desgaste visual'],
  ['Traseira', 'Faixa Refletiva do Para-choque', 'SEGURANÇA', 'GRAVE', 'Faixas avariadas'],
  ['Traseira', 'Faixa Refletiva do Para-choque', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Faixas ausentes'],
];

const CAMINHOES_RULES: ClusterizacaoRule[] = buildRules('caminhoes', [
  ...CABINE_SHARED,
  ...FRONTAL_SHARED,
  ['Baú', 'Puxador baia', 'SEGURANÇA', 'GRAVE', 'Rasgado, com nó, fixado no lado externo'],
  ['Baú', 'Puxador baia', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausência, preso ou passando pelo cabo, curto e/ou arrebentado'],
  ['Baú', 'Alça Pega Mão', 'SEGURANÇA', 'GRAVE', 'Rasgado, curto, nó'],
  ['Baú', 'Alça Pega Mão', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausência, curto e/ou arrebentado'],
  ['Baú', 'Plataforma', 'SEGURANÇA', 'GRAVE', 'Amassada, portas cortantes'],
  ['Baú', 'Plataforma', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Quebradas, soltas, presas'],
  ['Baú', 'Kit Ergonômico', 'SEGURANÇA', 'GRAVE', 'Amassados de modo que impeça ou dificulte a pega'],
  ['Baú', 'Kit Ergonômico', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Quebrados, sem parafuso, solto'],
  ['Baú', 'Baia Cortina', 'SEGURANÇA', 'MÉDIO', 'Baias amassadas'],
  ['Baú', 'Baia Cortina', 'SEGURANÇA', 'GRAVE', 'Baias avariadas com pontas cortantes, baia com dificuldade de movimentação ou presa'],
  ['Baú', 'Baia Cortina', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Cabo arrebentado, baia caindo'],
  ['Baú', 'Borracha Baia Cortina', 'SEGURANÇA', 'LEVE', 'Borracha com pequenas avarias'],
  ['Baú', 'Borracha Baia Cortina', 'SEGURANÇA', 'MÉDIO', 'Borrachas com avarias médias'],
  ['Baú', 'Borracha Baia Cortina', 'SEGURANÇA', 'GRAVE', 'Borracha com grandes avarias ou estouradas'],
  ['Baú', 'Borracha Baia Cortina', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Baia sem borracha'],
  ['Baú', 'Anti-guilhotina', 'SEGURANÇA', 'GRAVE', 'Avarias, amassos e fora do padrão, soltando'],
  ['Baú', 'Anti-guilhotina', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausência e/ou fora do tamanho padrão'],
  ['Baú', 'Luzes vigias', 'SEGURANÇA', 'MÉDIO', 'Queimadas, ausentes e/ou quebradas sem acender'],
  ['Baú', 'Luzes vigias', 'QUALIDADE', 'LEVE', 'Vigia com lente quebrada ou trincada, ou solta, mas acende'],
  ['Baú', 'Anticiclista/Estribo', 'SEGURANÇA', 'MÉDIO', 'Amassado e/ou quebrado'],
  ['Baú', 'Anticiclista/Estribo', 'SEGURANÇA', 'GRAVE', 'Ausente'],
  ['Baú', 'Adesivos autoridades de trânsito competente', 'SEGURANÇA', 'LEVE', 'Ausência, avariado e/ou apagado'],
  ['Baú', 'Faixa refletivas lateral', 'SEGURANÇA', 'GRAVE', 'Faixas avariadas'],
  ['Baú', 'Faixa refletivas lateral', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Faixas ausentes'],
  ['Baú', 'Levanta Fio', 'SEGURANÇA', 'MÉDIO', 'Amassados'],
  ['Baú', 'Levanta Fio', 'SEGURANÇA', 'GRAVE', 'Ausência ou avaria que impeça o cumprimento de seu objetivo'],
  ['Baú', 'Qualidade Visual do Baú', 'QUALIDADE', 'LEVE', 'Desgaste das informações visuais e de marca'],
  ['Baú', 'Qualidade Estrutural do Baú (Interna e Externa)', 'QUALIDADE', 'GRAVE', 'Avaria na estrutura ou ausência de partes do baú que não comprometa a qualidade dos produtos e que indique alguma colisão'],
  ['Baú', 'Qualidade Estrutural do Baú (Interna e Externa)', 'QUALIDADE', 'BLOQUEIO IMEDIATO', 'Avaria na estrutura ou ausência de partes do baú que comprometa a qualidade dos produtos'],
  ['Baú', 'Cofre', 'SEGURANÇA', 'GRAVE', 'Avariado sem comprometer a estrutura e/ou modelo não compatível com o nível de risco da operação conforme item de prevenção à violência'],
  ['Baú', 'Cofre', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausente ou avariado de forma a comprometer a estrutura'],
  ...TRASEIRA_SHARED_BASE,
  ['Traseira', 'Adesivos Obrigatórios Segurança (Toolkit De Prevenção à Violência)', 'SEGURANÇA', 'GRAVE', 'Ausência, avariado e/ou apagado'],
  ['Pneus', 'Milimetragem', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pneu com milimetragem de pelo menos um sulco abaixo de 1,6mm'],
  ['Pneus', 'Estado de Conservação', 'SEGURANÇA', 'GRAVE', 'Pneu com pequena avaria, menor que 1 cm'],
  ['Pneus', 'Estado de Conservação', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pneu descalibrado/vazio e/ou avaria maior que 1 cm'],
  ['Itens Extras', 'Kit Higienização', 'SEGURANÇA', 'MÉDIO', 'Corote avariado, sem água, sem sabão e/ou outros meios de higienização'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'MÉDIO', 'Fiação exposta sem emendas e/ou caixa de fusível aberta'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'GRAVE', 'Fiação exposta, gambiarras, fiação com emendas'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Fiação exposta com fios desencapados'],
  ['Itens Extras', 'Proteção das baterias', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Sem tampa ou tampa quebrado com o carrinho posicionado por cima ou chance de contato'],
]);

const PUXADA_RULES: ClusterizacaoRule[] = buildRules('puxada', [
  ...CABINE_SHARED,
  ...FRONTAL_SHARED,
  ['Sider', 'Lona', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Avariada e/ou rasgada'],
  ['Sider', 'Trava lona', 'SEGURANÇA', 'GRAVE', 'Mal fixada'],
  ['Sider', 'Trava lona', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausente e/ou avariada'],
  ['Sider', 'Tela de Amarração', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Avariada, rasgada e/ou ausente'],
  ['Sider', 'Estrutura Interna Baú', 'SEGURANÇA', 'GRAVE', 'Avariada'],
  ['Sider', 'Estrutura Interna Baú', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Quebrada e/ou ausente'],
  ['Sider', 'Luzes vigias', 'SEGURANÇA', 'MÉDIO', 'Queimadas, ausentes, quebradas sem acender'],
  ['Sider', 'Luzes vigias', 'QUALIDADE', 'LEVE', 'Vigia com lente quebrada ou trincada e/ou solta mas acende'],
  ['Sider', 'Bloqueio das Plataformas Laterais', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Plataforma disponível/liberado para utilização'],
  ['Sider', 'Travas da Lona', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Avariada e/ou quebrada'],
  ['Sider', 'Anticiclista/Estribo', 'SEGURANÇA', 'MÉDIO', 'Amassado e/ou quebrado'],
  ['Sider', 'Anticiclista/Estribo', 'SEGURANÇA', 'GRAVE', 'Ausente'],
  ['Sider', 'Faixa refletivas lateral', 'SEGURANÇA', 'GRAVE', 'Faixas avariadas'],
  ['Sider', 'Faixa refletivas lateral', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Faixas ausentes'],
  ['Sider', 'Levanta Fio', 'SEGURANÇA', 'MÉDIO', 'Amassados'],
  ['Sider', 'Levanta Fio', 'SEGURANÇA', 'GRAVE', 'Ausência ou avaria que impeça o cumprimento de seu objetivo'],
  ['Sider', 'Qualidade Visual do Baú', 'QUALIDADE', 'LEVE', 'Desgaste das informações visuais e de marca'],
  ['Sider', 'Estrutura Externa do Baú', 'QUALIDADE', 'GRAVE', 'Avaria na estrutura ou ausência de partes do baú que não comprometa a qualidade dos produtos e que indique alguma colisão'],
  ['Sider', 'Estrutura Externa do Baú', 'QUALIDADE', 'BLOQUEIO IMEDIATO', 'Avaria na estrutura ou ausência de partes do baú que comprometa a qualidade dos produtos'],
  ['Sider', 'Cofre', 'SEGURANÇA', 'GRAVE', 'Avariado sem comprometer a estrutura e/ou modelo não compatível com o nível de risco da operação conforme item de prevenção à violência'],
  ['Sider', 'Cofre', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausente ou avariado de forma a comprometer a estrutura'],
  ...TRASEIRA_SHARED_BASE,
  ['Traseira', 'Adesivos Obrigatórios Segurança (Toolkit De Prevenção à Violência e Segurança)', 'SEGURANÇA', 'GRAVE', 'Ausência, avariado e/ou apagado'],
  ['Pneus', 'Milimetragem (medidor digital)', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pneu com milimetragem de pelo menos um sulco abaixo de 1,6mm'],
  ['Pneus', 'Estado de Conservação', 'SEGURANÇA', 'GRAVE', 'Pneu com pequena avaria, menor que 1 cm'],
  ['Pneus', 'Estado de Conservação', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pneu descalibrado/vazio e/ou avaria maior que 1 cm'],
  ['Itens Extras', 'Kit Covid', 'SEGURANÇA', 'GRAVE', 'Corote avariado, sem água, sem sabão e/ou outros meios de higienização'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'MÉDIO', 'Fiação exposta sem emendas e/ou caixa de fusível aberta'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'GRAVE', 'Fiação exposta, gambiarras, fiação com emendas'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Fiação exposta com fios desencapados'],
  ['Itens Extras', 'Proteção das baterias', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Sem tampa ou tampa quebrado com o carrinho posicionado por cima ou chance de contato'],
  ['Itens Extras', 'Paleteira', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausente, avariada e/ou sem selo de inspeção'],
]);

const EMPILHADEIRA_RULES: ClusterizacaoRule[] = buildRules('empilhadeira', [
  ['Segurança & Cabine', 'Cinto de segurança', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausência, avarias e/ou desgaste'],
  ['Segurança & Cabine', 'Sensor de cinto de segurança', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Empilhadeira movimentar com o cinto desacoplado'],
  ['Segurança & Cabine', 'Sensor de assento', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Empilhadeira movimentar sem peso no banco'],
  ['Segurança & Cabine', 'Extintor de incêndio', 'SEGURANÇA', 'GRAVE', 'Despressurizado, vencido e/ou ausente'],
  ['Segurança & Cabine', 'Blue Spot Traseiro', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausente, queimado e/ou pane elétrica'],
  ['Segurança & Cabine', 'Leds Laterais', 'QUALIDADE', 'LEVE', 'Lente quebrada, trincada, mas acendendo'],
  ['Segurança & Cabine', 'Leds Laterais', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Ausente, queimado e/ou pane elétrica'],
  ['Segurança & Cabine', 'Limitador de velocidade', 'SEGURANÇA', 'GRAVE', 'Sem limitador de velocidade ou limitado para velocidades acima de 14km/h'],
  ['Segurança & Cabine', 'Para-brisa Vidro Automotivo', 'SEGURANÇA', 'GRAVE', 'Vidro com pequena avaria'],
  ['Segurança & Cabine', 'Para-brisa Vidro Automotivo', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Vidro solto e/ou com avarias grandes'],
  ['Segurança & Cabine', 'Proteção no teto em vidro automotivo', 'SEGURANÇA', 'GRAVE', 'Vidro com pequena avaria'],
  ['Segurança & Cabine', 'Proteção no teto em vidro automotivo', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Quebrado, ausente e/ou solto'],
  ['Segurança & Cabine', 'Grade protetora para o vidro superior', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Grade avariada ou ausente'],
  ['Segurança & Cabine', 'Cilindro de GLP', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Mangueira danificada, conexões avariadas, vazamento de GLP, cilindro não fixado ou solto'],
  ['Segurança & Cabine', 'Pontos de Apoio Acesso à Cabine', 'SEGURANÇA', 'GRAVE', 'Antiderrapante ausente e/ou avariado/desgastado'],
  ['Segurança & Cabine', 'Pontos de Apoio Acesso à Cabine', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pontos de apoio ausente e/ou solto'],

  ['Torre & Hidráulica', 'Altura da proteção da grade frontal', 'SEGURANÇA', 'GRAVE', 'Altura abaixo de 1700mm'],
  ['Torre & Hidráulica', 'Garfo Hidráulico', 'SEGURANÇA', 'GRAVE', 'Ruídos de atrito por falta de lubrificação'],
  ['Torre & Hidráulica', 'Garfo Hidráulico', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Não realizar toda a movimentação padrão, quebrado e/ou avariado'],
  ['Torre & Hidráulica', 'Torre', 'SEGURANÇA', 'GRAVE', 'Ruídos de atrito por falta de lubrificação; Borracha danificada, avariada'],
  ['Torre & Hidráulica', 'Proteção Emborrachada da Torre', 'QUALIDADE', 'BLOQUEIO IMEDIATO', 'Proteção avariada de forma a causar dano aos produtos transportados ou proteção ausente'],
  ['Torre & Hidráulica', 'Vazamento de óleo', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Vazamento de óleo no sistema hidráulico'],

  ['Sinalização & Elétrica', 'Farolete Dianteiros', 'QUALIDADE', 'LEVE', 'Lente e estrutura dos faroletos avariados'],
  ['Sinalização & Elétrica', 'Farolete Dianteiros', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Faróis queimados, pane elétrica, em pelo menos um dos faroletos'],
  ['Sinalização & Elétrica', 'Buzina (Volante)', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Buzina sem acionar, falhando ou ausente'],
  ['Sinalização & Elétrica', 'Buzina (Alça traseira)', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Buzina sem acionar, falhando ou ausente'],
  ['Sinalização & Elétrica', 'Luz de Ré e Freio', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Luzes queimadas, pane elétrica, em pelo menos uma das luzes'],
  ['Sinalização & Elétrica', 'Luz de Ré e Freio', 'QUALIDADE', 'LEVE', 'Lente e estrutura de uma das luzes avariadas'],
  ['Sinalização & Elétrica', 'Sirene de ré', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Sirene ausente, falhando ou som baixo'],
  ['Sinalização & Elétrica', 'Farolete no teto', 'SEGURANÇA', 'MÉDIO', 'Luz queimada e/ou pane elétrica'],
  ['Sinalização & Elétrica', 'Farolete no teto', 'QUALIDADE', 'LEVE', 'Lente e/ou estrutura do farolete avariado'],

  ['Pneus & Rodas', 'Pneus', 'SEGURANÇA', 'MÉDIO', 'Pneu com leves avarias'],
  ['Pneus & Rodas', 'Pneus', 'SEGURANÇA', 'GRAVE', 'Pneu com desgaste avançado mas no limite da linha de vida, avarias maiores'],
  ['Pneus & Rodas', 'Pneus', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Pneu abaixo da linha de vida e grandes rachaduras'],
  ['Pneus & Rodas', 'Rodas', 'SEGURANÇA', 'MÉDIO', 'Pequenas avarias'],
  ['Pneus & Rodas', 'Rodas', 'SEGURANÇA', 'GRAVE', 'Amassada e/ou empenada'],
  ['Pneus & Rodas', 'Rodas', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Grandes avarias, faltando parafuso e/ou parafusos soltos'],

  ['Cabine, Visibilidade & 5S', 'Lavador Para-Brisas', 'SEGURANÇA', 'LEVE', 'Reservatório vazio'],
  ['Cabine, Visibilidade & 5S', 'Lavador Para-Brisas', 'SEGURANÇA', 'MÉDIO', 'Palhetas ausentes, sem funcionar'],
  ['Cabine, Visibilidade & 5S', 'Alça traseira', 'SEGURANÇA', 'LEVE', 'Alça quebrada, desgastada e/ou avariada'],
  ['Cabine, Visibilidade & 5S', 'Espelho Convexo', 'SEGURANÇA', 'GRAVE', 'Quebrado e/ou avariado'],
  ['Cabine, Visibilidade & 5S', 'Espelho Convexo', 'SEGURANÇA', 'MÉDIO', 'Ausente'],
  ['Cabine, Visibilidade & 5S', 'Retrovisores', 'SEGURANÇA', 'GRAVE', 'Espelho trincado sem prejudicar a visibilidade'],
  ['Cabine, Visibilidade & 5S', 'Retrovisores', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Quebrados prejudicando a visualização e/ou ausente'],
  ['Cabine, Visibilidade & 5S', 'Volante', 'QUALIDADE', 'LEVE', 'Volante descascado, rasgado e avariado'],
  ['Cabine, Visibilidade & 5S', 'Volante', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Volante solto, quebrado, manopla para volante ausente'],
  ['Cabine, Visibilidade & 5S', 'Faixas refletivas', 'SEGURANÇA', 'MÉDIO', 'Faixas avariadas, desgastadas'],
  ['Cabine, Visibilidade & 5S', 'Faixas refletivas', 'SEGURANÇA', 'GRAVE', 'Ausentes, apagadas'],
  ['Cabine, Visibilidade & 5S', 'Bancos', 'QUALIDADE', 'LEVE', 'Avariados, rasgados'],
  ['Cabine, Visibilidade & 5S', 'Qualidade Visual', 'QUALIDADE', 'LEVE', 'Desgaste das informações visuais'],
  ['Cabine, Visibilidade & 5S', '5S', 'QUALIDADE', 'LEVE', 'Cabine e bancos manchados porém limpos'],
  ['Cabine, Visibilidade & 5S', '5S', 'QUALIDADE', 'MÉDIO', 'Cabine e bancos com sujeira aparente indicando falta de higiene e organização'],

  ['Itens Extras', 'Kit Covid', 'SEGURANÇA', 'GRAVE', 'Produto para higienização ausente'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'MÉDIO', 'Fiação exposta sem emendas, caixa de fusível aberta'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'GRAVE', 'Fiação exposta, gambiarras, fiação com emendas'],
  ['Itens Extras', 'Fiação exposta', 'SEGURANÇA', 'BLOQUEIO IMEDIATO', 'Fiação exposta com fios desencapados'],
  ['Itens Extras', 'Tara máxima', 'SEGURANÇA', 'GRAVE', 'Ausência, avariado, desgastado'],
]);

export const CLUSTERIZACAO_BY_MODAL: Record<
  ClusterizacaoModalKey,
  ClusterizacaoRule[]
> = {
  caminhoes: CAMINHOES_RULES,
  puxada: PUXADA_RULES,
  empilhadeira: EMPILHADEIRA_RULES,
};
