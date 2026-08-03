import { UserChip } from '@/components/UserChip';

/** Header-scoped name for the account menu entry point. Thin wrapper: UserChip is shared beyond the header. */
export function AccountMenuTrigger() {
  return <UserChip />;
}

export default AccountMenuTrigger;
