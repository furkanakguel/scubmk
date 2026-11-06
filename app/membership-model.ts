export const clubRoles = {
  member: 'Üye',
  core: 'Asil üye',
  president: 'Başkan',
  vice_president: 'Başkan yardımcısı',
  advisor: 'Akademik danışman',
} as const;
export type ClubRole = keyof typeof clubRoles;
export const regularStyles = ['forest', 'cobalt', 'copper', 'mono'] as const;
export type CardStyle = (typeof regularStyles)[number] | 'assembly' | 'executive' | 'advisor';
export const cardDesigns: Record<CardStyle, { name: string; caption: string; edition: string }> = {
  forest: { name: 'Kernel', caption: 'Zümrüt yeşili, işlenmiş metal.', edition: 'ÜYE KARTI' },
  cobalt: {
    name: 'Protocol',
    caption: 'Gece mavisi, halkalı krom işçiliği.',
    edition: 'ÜYE KARTI',
  },
  copper: { name: 'Vector', caption: 'Saten bakır, katlanmış metal.', edition: 'ÜYE KARTI' },
  mono: { name: 'Terminal', caption: 'Grafit siyahı, parlatılmış krom.', edition: 'ÜYE KARTI' },
  assembly: {
    name: 'Assembly',
    caption: 'Asil üyelere özel. Birbirine geçen titanyum.',
    edition: 'ASİL ÜYE',
  },
  executive: {
    name: 'Root',
    caption: 'Başkan ve başkan yardımcısına özel. Mat siyah ve şampanya altını.',
    edition: 'YÖNETİM',
  },
  advisor: {
    name: 'Axiom',
    caption: 'Akademik danışmanımıza özel. Fildişi, altın ve ince gravür.',
    edition: 'AKADEMİK DANIŞMAN',
  },
};
export type ClubAccount = {
  id: string;
  name: string;
  email: string;
  department: string;
  club_role: ClubRole;
  card_style: (typeof regularStyles)[number];
  member_no: string;
  card_code: string;
  active: number;
  created_at: number;
  updated_at: number;
};
export function effectiveStyle(account: Pick<ClubAccount, 'club_role' | 'card_style'>): CardStyle {
  return account.club_role === 'advisor'
    ? 'advisor'
    : ['president', 'vice_president'].includes(account.club_role)
      ? 'executive'
      : account.club_role === 'core'
        ? 'assembly'
        : account.card_style;
}
