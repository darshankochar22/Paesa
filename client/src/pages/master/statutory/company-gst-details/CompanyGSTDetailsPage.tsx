// Routed page wrapper for Company GST Details.
// Renders the GST Details screen in-flow (inside the app layout, between the
// global Navbar and Footer) — matching every other master. The overlay variant
// is used only by the F11 Company Features popup.

import { useNavigate } from 'react-router-dom';
import CompanyGSTDetailsModal from './CompanyGSTDetailsModal';

export default function CompanyGSTDetailsPage() {
  const navigate = useNavigate();
  return <CompanyGSTDetailsModal isOpen asPage onClose={() => navigate(-1)} />;
}
