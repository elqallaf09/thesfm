import NextErrorComponent, { type ErrorProps } from 'next/error';

export default function CustomError(props: ErrorProps) {
  return <NextErrorComponent {...props} />;
}

CustomError.getInitialProps = NextErrorComponent.getInitialProps;
