import { ResultadoInspecao } from '../entities/Inspecao.js';

export function calcularResultadoInspecao(
  qtdReprovada: number,
  qtdPlanejada: number,
  percentualRessalva: number,
): ResultadoInspecao {
  if (qtdReprovada === 0) return ResultadoInspecao.APROVADO;
  const taxaFalha = (qtdReprovada / qtdPlanejada) * 100;
  if (taxaFalha <= percentualRessalva) return ResultadoInspecao.APROVADO_RESTRICAO;
  return ResultadoInspecao.REPROVADO;
}
