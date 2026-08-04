import Image from 'next/image';
import Link from 'next/link';

type BrandLockupProps = {
  crumb: string;
};

export function BrandLockup({ crumb }: BrandLockupProps) {
  return (
    <Link href="/dashboard" prefetch={false} className="sfm-global-brand" aria-label="THE SFM">
      <Image src="/sfm-logo.png" alt="" width={30} height={30} priority className="sfm-brand-mark sfm-brand-mark--header" />
      <span className="sfm-global-brand-copy">
        <strong>THE SFM</strong>
        <span>{crumb}</span>
      </span>
    </Link>
  );
}

export default BrandLockup;
