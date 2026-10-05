import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <title>Page not found · Loan Planner</title>
      <div className="page-heading">
        <h1>Page not found</h1>
        <p className="page-heading__lead">The page you asked for does not exist.</p>
        <Link className="button" to="/">
          Go to the EMI calculator
        </Link>
      </div>
    </>
  );
}
