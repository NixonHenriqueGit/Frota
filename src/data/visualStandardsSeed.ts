import {
  VisualChecklistItemDef,
  VisualStandardScope,
  VisualValidationPayload,
} from '../types/fleet';

export interface VisualStandardDeckMeta {
  scope: VisualStandardScope;
  code: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  pdfUrl: string;
  pdfFileName: string;
  modalOptions: string[];
  applicationFilters: string[];
  items: VisualChecklistItemDef[];
}

export const FROTA_VISUAL_ITEMS: VisualChecklistItemDef[] = [
  {
    id: 'frota-01',
    order: 1,
    name: 'ALÇA PEGA-MÃO',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Ausência, curto e/ou arrebentado',
  },
  {
    id: 'frota-02',
    order: 2,
    name: 'ANTI-GUILHOTINA',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Ausência e/ou fora do padrão (tamanho/material)',
  },
  {
    id: 'frota-03',
    order: 3,
    name: 'CORTINA DA BAIA',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Baias avariadas com pontas cortantes, baia com dificuldade de movimentação ou presa, cabo arrebentado, baia caindo',
  },
  {
    id: 'frota-04',
    order: 4,
    name: 'PLATAFORMAS LATERAIS',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Plataforma indisponível ou bloqueada para utilização',
  },
  {
    id: 'frota-05',
    order: 5,
    name: 'BORRACHA DA CORTINA DA BAIA',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Baia sem borracha',
  },
  {
    id: 'frota-06',
    order: 6,
    name: 'BUZINA',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Buzina falhando, som baixo ou ausente',
  },
  {
    id: 'frota-07',
    order: 7,
    name: 'CARRINHO E CONES',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Avarias no carrinho, ou na faixa refletiva do cone, ausência de suporte, carrinho e/ou cones',
  },
  {
    id: 'frota-08',
    order: 8,
    name: 'CINTO DE SEGURANÇA',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Ausência, avarias e/ou desgaste na estrutura e/ou no retrator de cinto',
  },
  {
    id: 'frota-09',
    order: 9,
    name: 'COFRE',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Ausente ou avariado de forma a comprometer a estrutura',
  },
  {
    id: 'frota-10',
    order: 10,
    name: 'DOC. OBRIGATÓRIOS',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Documentação ausente ou vencida',
  },
  {
    id: 'frota-11',
    order: 11,
    name: 'ESTRUTURA INTERNA SIDER',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Quebrada e/ou ausente',
  },
  {
    id: 'frota-12',
    order: 12,
    name: 'ESTRUTURA RAMPA/ HIDRÁULICO',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Mangueiras avariadas, trincas e/ou parafusos ausentes, rampa avariada e/ou com estrutura comprometida',
  },
  {
    id: 'frota-13',
    order: 13,
    name: 'FAIXA REFLETIVA PARA-CHOQUE',
    application: 'BAIADO E SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Faixas ausentes',
  },
  {
    id: 'frota-14',
    order: 14,
    name: 'FAIXA REFLETIVA LATERAL',
    application: 'BAIADO E SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Faixas avariadas e/ou ausentes em caminhões de longa distância/noturnas',
  },
  {
    id: 'frota-15',
    order: 15,
    name: 'FAROL',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Farol queimado, problemas elétricos, e/ou ausente mesmo que seja em apenas um',
  },
  {
    id: 'frota-16',
    order: 16,
    name: 'LANTERNA TRASEIRA',
    application: 'BAIADO E SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Farol/lanterna queimado, problemas elétricos, ausente mesmo que seja em apenas um',
  },
  {
    id: 'frota-17',
    order: 17,
    name: 'KIT ERGONÔMICO',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Amassados de modo que impeça e/ou dificulte a pegada, quebrados, sem parafuso, solto',
  },
  {
    id: 'frota-18',
    order: 18,
    name: 'LIMPADOR',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Ausência ou não funcionamento das palhetas, borrachas desgastadas, mangueira desconectada ou obstruída',
  },
  {
    id: 'frota-19',
    order: 19,
    name: 'LONA',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Avariada e/ou rasgada; Ausente e/ou avariada',
  },
  {
    id: 'frota-20',
    order: 20,
    name: 'LUZ DE FREIO',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Luz de freio queimada, problemas elétricos, ausente mesmo que seja em apenas um',
  },
  {
    id: 'frota-21',
    order: 21,
    name: 'LUZ DE RÉ',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Luz queimada mesmo que seja apenas uma, quebrados sem funcionar, sem sinal sonoro de ré e/ou sinal sonoro de ré baixo',
  },
  {
    id: 'frota-22',
    order: 22,
    name: 'LUZES VIGIA',
    application: 'BAIADO E SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Queimadas, ausentes e/ou quebradas sem acender no retorno de rota em caminhões de longa distância/noturna',
  },
  {
    id: 'frota-23',
    order: 23,
    name: 'MAÇANETA E PORTAS',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Porta não fechar ou não trancar',
  },
  {
    id: 'frota-24',
    order: 24,
    name: 'MANOPLA',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Manopla ausente apenas no ferro e/ou avariada de forma a impedir o correto manuseio',
  },
  {
    id: 'frota-25',
    order: 25,
    name: 'MILIMETRAGEM (medidor digital)',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Pneu com milimetragem abaixo de 1,6mm, ou pneu descalibrado/vazio e/ou avaria maior que 1 cm',
  },
  {
    id: 'frota-26',
    order: 26,
    name: 'PAINEL DE CONTROLE',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Alavanca avariada, alavanca ausente, botões avariados, mangueiras avariadas/vazamento',
  },
  {
    id: 'frota-27',
    order: 27,
    name: 'PALETEIRA',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Avariada e/ou sem selo de inspeção',
  },
  {
    id: 'frota-28',
    order: 28,
    name: 'PISCAS',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Pisca e/ou pisca auxiliar queimado, problemas elétricos, ausente mesmo que seja em apenas um',
  },
  {
    id: 'frota-29',
    order: 29,
    name: 'PLACAS DO VEÍCULO',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Ausência, desgaste impossibilitando visualização completa dos dados, fixação fora do padrão',
  },
  {
    id: 'frota-30',
    order: 30,
    name: 'PLATAFORMA',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Quebradas, soltas, presas',
  },
  {
    id: 'frota-31',
    order: 31,
    name: 'PONTOS DE APOIO - CABINE',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Escada e/ou pontos de apoio ausentes e/ou soltos',
  },
  {
    id: 'frota-32',
    order: 32,
    name: 'PONTO DE APOIO - COMPARTIMENTO',
    application: 'VAN',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Avariados e/ou ausentes, soltos',
  },
  {
    id: 'frota-33',
    order: 33,
    name: 'PROTEÇÃO DAS BATERIAS',
    application: 'BAIADO E SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Sem tampa ou tampa quebrada com o carrinho posicionado por cima ou chance de contato',
  },
  {
    id: 'frota-34',
    order: 34,
    name: 'PUXADOR BAIA',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Ausência, preso ou passando pelo cabo, curto e/ou arrebentado',
  },
  {
    id: 'frota-35',
    order: 35,
    name: 'QUALIDADE ESTRUTURAL BAÚ',
    application: 'BAIADO',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Avaria na estrutura ou ausência de partes do baú que comprometa a qualidade dos produtos',
  },
  {
    id: 'frota-36',
    order: 36,
    name: 'RETROVISOR',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Espelho quebrado de forma a prejudicar a visualização, ausência e/ou braço quebrado',
  },
  {
    id: 'frota-37',
    order: 37,
    name: 'SENSOR DE CINTO',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Sensor sonoro inexistente ou danificado',
  },
  {
    id: 'frota-38',
    order: 38,
    name: 'TARA MÁXIMA',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Ausência',
  },
  {
    id: 'frota-39',
    order: 39,
    name: 'TELA DE AMARRAÇÃO',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Avariada, rasgada e/ou ausente',
  },
  {
    id: 'frota-40',
    order: 40,
    name: 'TELA DE RÉ E CÂMERA',
    application: 'VAN',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Câmera ausente e/ou avariada',
  },
  {
    id: 'frota-41',
    order: 41,
    name: 'TRAVA DAS LONAS',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Avariada e/ou ausente',
  },
  {
    id: 'frota-42',
    order: 42,
    name: 'TRAVA RAMPA ELEVATÓRIA',
    application: 'SIDER',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Avariada e/ou ausente',
  },
  {
    id: 'frota-43',
    order: 43,
    name: 'VIDROS FRONTAIS/ LATERAIS',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Trincas maiores nos vidros laterais e/ou qualquer avaria no para-brisas que comprometa a visibilidade e segurança',
  },
  {
    id: 'frota-44',
    order: 44,
    name: 'VOLANTE',
    application: 'TODOS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Volante com folga, quebrado, solto e/ou desgastado de forma a afetar a segurança da equipe de entrega',
  },
];

export const EQUIPAMENTOS_VISUAL_ITEMS: VisualChecklistItemDef[] = [
  {
    id: 'equip-01',
    order: 1,
    name: 'BLUE SPOT',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Ausente, queimado e/ou pane elétrica',
  },
  {
    id: 'equip-02',
    order: 2,
    name: 'BUZINAS',
    application: 'TODOS OS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Buzina sem acionar, falhando ou ausente (*Buzina da alça se aplica apenas em empilhadeiras)',
  },
  {
    id: 'equip-03',
    order: 3,
    name: 'CILINDRO GLP',
    application: 'EMPILHADEIRA MOVIDAS A GÁS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Mangueira danificada, conexões avariadas, vazamento de GLP, cilindro não fixado ou solto',
  },
  {
    id: 'equip-04',
    order: 4,
    name: 'CINTO DE SEGURANÇA',
    application: 'TODOS OS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly:
      'Ausência, avarias e/ou desgaste na estrutura e/ou no retrator de cinto e/ou cinto com a coloração diferente de laranja/vermelho.',
  },
  {
    id: 'equip-05',
    order: 5,
    name: 'FAROLETES',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Faróis queimados, pane elétrica, em pelo menos um dos faroletes',
  },
  {
    id: 'equip-06',
    order: 6,
    name: 'FIAÇÃO EXPOSTA',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Fiação exposta com fios desencapados',
  },
  {
    id: 'equip-07',
    order: 7,
    name: 'GARFO HIDRÁULICO',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Não realizar toda a movimentação padrão, quebrado e/ou avariado',
  },
  {
    id: 'equip-08',
    order: 8,
    name: 'GRADE PROTETORA',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Grade avariada ou ausente',
  },
  {
    id: 'equip-09',
    order: 9,
    name: 'LUZ DE RÉ E FREIO',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Vidro solto e/ou com avarias grandes',
  },
  {
    id: 'equip-10',
    order: 10,
    name: 'PNEUS',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Pneu com desgaste avançado, abaixo da linha de vida ou grandes rachaduras',
  },
  {
    id: 'equip-11',
    order: 11,
    name: 'PONTOS DE ACESSO À CABINE',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Grade avariada ou ausente',
  },
  {
    id: 'equip-12',
    order: 12,
    name: 'PROTEÇÃO EMBORRACHADA',
    application: 'EMPILHADEIRA',
    severity: 'QUALIDADE – BLOQUEIO',
    anomaly:
      'Proteção avariada de forma a causar dano aos produtos transportados ou proteção ausente',
  },
  {
    id: 'equip-13',
    order: 13,
    name: 'PROTEÇÃO DE VIDRO',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Quebrado, ausente e/ou solto',
  },
  {
    id: 'equip-14',
    order: 14,
    name: 'RETROVISOR',
    application: 'TODOS OS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Quebrados prejudicando a visualização e/ou ausente',
  },
  {
    id: 'equip-15',
    order: 15,
    name: 'RODAS',
    application: 'TODOS OS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Grandes avarias, faltando parafuso e/ou parafuso solto',
  },
  {
    id: 'equip-16',
    order: 16,
    name: 'TORRE',
    application: 'EMPILHADEIRA',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Não movimentar da forma correta, quebrada e/ou avariada',
  },
  {
    id: 'equip-17',
    order: 17,
    name: 'VOLANTE',
    application: 'TODOS OS MODAIS',
    severity: 'SEGURANÇA – BLOQUEIO',
    anomaly: 'Volante solto e/ou ausente',
  },
];

export const VISUAL_STANDARD_DECKS: Record<VisualStandardScope, VisualStandardDeckMeta> = {
  frota: {
    scope: 'frota',
    code: '1.2.2.1 · FROTA',
    title: 'CONFORMIDADE DA FROTA — CAMINHÕES, CARRETAS E PALETEIRAS',
    shortTitle: 'Frota (Caminhões, Carretas, Paleteiras)',
    subtitle:
      '44 itens críticos de inspeção visual e bloqueio de segurança (Baiado, Sider, Van e Todos os Modais)',
    pdfUrl:
      '/assets/aistudio/Padr_o_Visual_-_Conformidade_da_Frota_Caminh_es__Carretas__Palateiras_76de5360.pdf',
    pdfFileName: 'Padrão Visual - Conformidade da Frota Caminhões, Carretas, Palateiras.pdf',
    modalOptions: ['BAIADO', 'SIDER', 'VAN', 'CARRETA / PUXADA', 'PALETEIRA', 'TODOS MODAIS'],
    applicationFilters: ['TODOS', 'TODOS MODAIS', 'BAIADO', 'SIDER', 'BAIADO E SIDER', 'VAN'],
    items: FROTA_VISUAL_ITEMS.map((item) => ({
      ...item,
      imageUrl: `/assets/visual-standards/frota-${String(item.order).padStart(2, '0')}.jpg`,
    })),
  },
  equipamentos: {
    scope: 'equipamentos',
    code: '1.2.2.2 · ARMAZÉM',
    title: 'CONFORMIDADE DOS EQUIPAMENTOS DE ARMAZÉM',
    shortTitle: 'Equipamentos de Armazém',
    subtitle:
      '17 itens críticos de inspeção visual para Empilhadeiras, Empilhadeiras a Gás (GLP) e Equipamentos de Armazém',
    pdfUrl:
      '/assets/aistudio/Padr_o_Visual_-_Conformidade_dos_Equipamentos_de_Armaz_m_b850fbe4.pdf',
    pdfFileName: 'Padrão Visual - Conformidade dos Equipamentos de Armazém.pdf',
    modalOptions: [
      'EMPILHADEIRA',
      'EMPILHADEIRA MOVIDAS A GÁS',
      'PALETEIRA ELÉTRICA',
      'TODOS OS MODAIS',
    ],
    applicationFilters: [
      'TODOS',
      'EMPILHADEIRA',
      'EMPILHADEIRA MOVIDAS A GÁS',
      'TODOS OS MODAIS',
    ],
    items: EQUIPAMENTOS_VISUAL_ITEMS.map((item) => ({
      ...item,
      imageUrl: `/assets/visual-standards/equip-${String(item.order).padStart(2, '0')}.jpg`,
    })),
  },
};

export const VISUAL_MIME_BY_SCOPE: Record<VisualStandardScope, string> = {
  frota: 'application/x-pb-visual-frota',
  equipamentos: 'application/x-pb-visual-equip',
};

export function serializeVisualValidation(payload: VisualValidationPayload): string {
  return JSON.stringify(payload);
}

export function parseVisualValidation(
  rawJson: string | undefined,
  fallbackScope: VisualStandardScope
): VisualValidationPayload | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson) as Partial<VisualValidationPayload>;
    if (!parsed || typeof parsed !== 'object') return null;
    const scope: VisualStandardScope =
      parsed.scope === 'equipamentos' || parsed.scope === 'frota'
        ? parsed.scope
        : fallbackScope;
    return {
      scope,
      assetLabel: String(parsed.assetLabel ?? ''),
      modalType: String(parsed.modalType ?? ''),
      inspector: String(parsed.inspector ?? ''),
      validatedAt: String(parsed.validatedAt ?? ''),
      generalNotes: typeof parsed.generalNotes === 'string' ? parsed.generalNotes : '',
      items:
        parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
    };
  } catch {
    return null;
  }
}
