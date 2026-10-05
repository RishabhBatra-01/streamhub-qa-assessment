import { NavLink, Route, Routes } from 'react-router';
import { useLoanParams } from './hooks/useLoanParams';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SchedulePage } from './pages/SchedulePage';

export function App() {
  const { loanSearch } = useLoanParams();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav__link${isActive ? ' nav__link--active' : ''}`;

  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header__inner">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">
              ₹
            </span>
            Loan Planner
          </span>
          <nav aria-label="Main">
            <ul className="nav">
              <li>
                <NavLink end to={{ pathname: '/', search: loanSearch }} className={navClass}>
                  EMI Calculator
                </NavLink>
              </li>
              <li>
                <NavLink to={{ pathname: '/schedule', search: loanSearch }} className={navClass}>
                  Payment Schedule
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="footer">
        Figures are estimates for planning only. Built for the Streamhub QA automation assessment.
      </footer>
    </div>
  );
}
