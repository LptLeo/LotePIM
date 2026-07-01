const STATUS_CLASS_BASE =
  'ml-auto min-h-[20px] text-center rounded-xs py-1 px-3 font-bold text-[10.4px] tracking-[0.52px] flex items-center justify-center leading-tight ';

export function obterClasseStatus(status: string): string {
  switch (status) {
    case 'aprovado':
      return STATUS_CLASS_BASE + 'bg-[#506600] border border-[#C3F400]/20 text-[#EFFFBC]';
    case 'aguardando_inspecao':
      return (
        STATUS_CLASS_BASE + 'bg-[#EAB308]/10 border border-[#EAB308]/20 text-[#EAB308]'
      );
    case 'reprovado':
      return STATUS_CLASS_BASE + 'bg-[#DC2626] border border-[#EF4444] text-[#FFFFFF]';
    case 'aprovado_restricao':
      return (
        STATUS_CLASS_BASE + 'bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316]'
      );
    default:
      return STATUS_CLASS_BASE + 'bg-[#201F1F] text-[#ADAAAA]';
  }
}

export function formatarStatus(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase();
}
