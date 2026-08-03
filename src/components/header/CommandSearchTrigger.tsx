import { CommandMenuButton } from '@/components/CommandMenuButton';

type CommandSearchTriggerProps = {
  ariaLabel: string;
};

/** Header-scoped name for the quick-search entry point. Thin wrapper: CommandMenuButton is shared beyond the header (e.g. the sidebar). */
export function CommandSearchTrigger({ ariaLabel }: CommandSearchTriggerProps) {
  return <CommandMenuButton aria-label={ariaLabel} />;
}

export default CommandSearchTrigger;
