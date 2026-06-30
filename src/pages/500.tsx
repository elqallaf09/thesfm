import NextErrorComponent from 'next/error';

export default function ServerErrorPage() {
  return <NextErrorComponent statusCode={500} />;
}

export function getStaticProps() {
  return { props: {} };
}
