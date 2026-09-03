import { forwardRef } from 'react';

/**
 * The single sliding surface that marks the active workspace destination —
 * a sibling element positioned via --indicator-x/--indicator-w (written by
 * WorkspaceSwitcher from the active tab's own offsetLeft/offsetWidth), not
 * a border/fill owned by each item individually.
 */
export const WorkspaceActiveIndicator = forwardRef<HTMLSpanElement>((_props, ref) => (
  <span className="sfm-workspace-indicator" ref={ref} aria-hidden="true" />
));

WorkspaceActiveIndicator.displayName = 'WorkspaceActiveIndicator';

export default WorkspaceActiveIndicator;
