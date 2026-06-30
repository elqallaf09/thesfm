import NextErrorComponent from 'next/error';

export default function NotFoundPage() {
  return <NextErrorComponent statusCode={404} />;
}
