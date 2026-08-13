import React from 'react';
import { CompanyApplicationsPage } from './CompanyApplicationsPage';

/**
 * `/company/shortlisted` route reuses the applications page in shortlist mode.
 * The page auto-applies the `Shortlisted` status filter when `mode="shortlisted"`.
 */
export const CompanyShortlistPage: React.FC = () => <CompanyApplicationsPage mode="shortlisted" />;

export default CompanyShortlistPage;
