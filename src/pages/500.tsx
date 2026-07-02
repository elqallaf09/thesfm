import Error from 'next/error';

export default function ServerErrorPage() {
  return <Error statusCode={500} />;
}
