export interface TransacaoIR {
  id: string;
  data: string;
  ticker: string;
  tipo: "compra" | "venda";
  quantidade: number;
  precoUnitario: number;
  classe: "Ação" | "FII" | "BDR" | "ETF";
}

export interface CalculoIRMes {
  mesAno: string; // "MM/YYYY"
  totalVendasAcoes: number;
  lucroAcoes: number;
  lucroFIIs: number;
  prejuizoAcumuladoAcoes: number;
  prejuizoAcumuladoFIIs: number;
  impostoAcoes: number;
  impostoFIIs: number;
  isentoAcoes: boolean;
  darfTotal: number;
}

export function calcularIR(transacoes: TransacaoIR[]): CalculoIRMes[] {
  // Ordenar transações cronologicamente
  const txs = [...transacoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  // Manter estado de posição (para preço médio)
  const posicoes: Record<string, { quantidade: number; precoMedio: number; classe: string }> = {};
  
  // Agrupar por mês
  const resultadosPorMes: Record<string, CalculoIRMes> = {};
  
  let prejuizoAcumuladoAcoes = 0;
  let prejuizoAcumuladoFIIs = 0;

  for (const tx of txs) {
    const data = new Date(tx.data);
    const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
    
    if (!resultadosPorMes[mesAno]) {
      resultadosPorMes[mesAno] = {
        mesAno,
        totalVendasAcoes: 0,
        lucroAcoes: 0,
        lucroFIIs: 0,
        prejuizoAcumuladoAcoes,
        prejuizoAcumuladoFIIs,
        impostoAcoes: 0,
        impostoFIIs: 0,
        isentoAcoes: false,
        darfTotal: 0
      };
    }

    const mesData = resultadosPorMes[mesAno];
    
    if (!posicoes[tx.ticker]) {
      posicoes[tx.ticker] = { quantidade: 0, precoMedio: 0, classe: tx.classe };
    }
    const pos = posicoes[tx.ticker];

    if (tx.tipo === "compra") {
      const valorTotalCompra = tx.quantidade * tx.precoUnitario;
      const patrimonioAtual = pos.quantidade * pos.precoMedio;
      pos.quantidade += tx.quantidade;
      pos.precoMedio = (patrimonioAtual + valorTotalCompra) / pos.quantidade;
    } else if (tx.tipo === "venda") {
      const valorTotalVenda = tx.quantidade * tx.precoUnitario;
      const custoTotalVenda = tx.quantidade * pos.precoMedio;
      const lucroBruto = valorTotalVenda - custoTotalVenda;
      
      pos.quantidade -= tx.quantidade;

      if (tx.classe === "Ação") {
        mesData.totalVendasAcoes += valorTotalVenda;
        mesData.lucroAcoes += lucroBruto;
      } else if (tx.classe === "FII") {
        mesData.lucroFIIs += lucroBruto;
      }
    }
  }

  // Segunda passada: calcular impostos e compensações por mês (em ordem)
  const mesesOrdenados = Object.values(resultadosPorMes).sort((a, b) => {
    const [ma, ya] = a.mesAno.split("/");
    const [mb, yb] = b.mesAno.split("/");
    return new Date(Number(ya), Number(ma) - 1).getTime() - new Date(Number(yb), Number(mb) - 1).getTime();
  });

  for (const mes of mesesOrdenados) {
    // AÇÕES
    mes.prejuizoAcumuladoAcoes = prejuizoAcumuladoAcoes;
    if (mes.lucroAcoes > 0) {
      if (mes.totalVendasAcoes <= 20000) {
        mes.isentoAcoes = true;
      } else {
        // Deduz prejuízo
        const lucroTributavel = Math.max(0, mes.lucroAcoes - prejuizoAcumuladoAcoes);
        const prejuizoUtilizado = mes.lucroAcoes - lucroTributavel;
        prejuizoAcumuladoAcoes -= prejuizoUtilizado;
        mes.impostoAcoes = lucroTributavel * 0.15; // 15% Swing Trade
      }
    } else if (mes.lucroAcoes < 0) {
      prejuizoAcumuladoAcoes += Math.abs(mes.lucroAcoes);
    }
    
    // FIIs
    mes.prejuizoAcumuladoFIIs = prejuizoAcumuladoFIIs;
    if (mes.lucroFIIs > 0) {
      const lucroTributavel = Math.max(0, mes.lucroFIIs - prejuizoAcumuladoFIIs);
      const prejuizoUtilizado = mes.lucroFIIs - lucroTributavel;
      prejuizoAcumuladoFIIs -= prejuizoUtilizado;
      mes.impostoFIIs = lucroTributavel * 0.20; // 20% FIIs
    } else if (mes.lucroFIIs < 0) {
      prejuizoAcumuladoFIIs += Math.abs(mes.lucroFIIs);
    }

    mes.darfTotal = mes.impostoAcoes + mes.impostoFIIs;
  }

  return mesesOrdenados.reverse(); // Do mais recente para o mais antigo
}
