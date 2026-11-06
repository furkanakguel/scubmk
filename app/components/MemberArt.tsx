import type { TeamProfile } from '../team';
export default function MemberArt({
  profile,
  large = false,
}: {
  profile: TeamProfile;
  large?: boolean;
}) {
  return (
    <div
      className={'member-art member-art-' + profile.index + (large ? ' large' : '')}
      style={{ '--member-accent': profile.accent } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="member-art-grid" />
      <span className="member-art-label mono">SCÜ BMK / PEOPLE</span>
      <div className="member-orbits">
        <i />
        <i />
        <i />
        <span>{profile.symbol}</span>
      </div>
      <span className="member-art-number">{profile.index}</span>
      <div className="member-art-footer mono">
        <span>MERAK ORTAK PAYDAMIZ.</span>
        <span>26 — 27</span>
      </div>
    </div>
  );
}
