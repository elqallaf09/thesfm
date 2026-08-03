import { forwardRef, type ReactNode } from 'react';

type MobileWorkspaceRailProps = {
  children: ReactNode;
};

/**
 * The horizontally-scrollable workspace track. Named for its mobile
 * requirements (safe edge padding, edge-fade scroll affordance, snap,
 * guaranteed-visible active item) because that's where a scroll rail's
 * behavior actually matters — but it's the same element at every viewport,
 * reflowed by CSS media queries rather than swapped for a second, separately
 * mounted mobile-only tree (consistent with how this header's responsive
 * layout has worked across every prior round: one DOM tree, no
 * viewport-conditional rendering, no hydration-mismatch risk).
 */
export const MobileWorkspaceRail = forwardRef<HTMLDivElement, MobileWorkspaceRailProps>(
  ({ children }, ref) => (
    <div className="sfm-workspace-tabs" ref={ref}>
      {children}
    </div>
  ),
);

MobileWorkspaceRail.displayName = 'MobileWorkspaceRail';

export default MobileWorkspaceRail;
