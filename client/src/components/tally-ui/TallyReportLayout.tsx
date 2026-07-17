import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageTitleBar from '@/components/ui/PageTitleBar';
import { useEscape } from '@/hooks/useEscape';

interface TallyReportLayoutProps {
  title: string;
  companyName: string;
  leftSubtitle?: React.ReactNode;
  rightSubtitle?: React.ReactNode;
  children: React.ReactNode;
  onQuit?: () => void;
  footerControls?: React.ReactNode;
  // `state` is passed to the Link so drill screens that read location.state keep
  // their context (kind/section/registration) when navigating back via the crumb.
  breadcrumb?: Array<{ label: string; to?: string; state?: unknown }>;
}

export function TallyReportLayout({
  title,
  companyName,
  leftSubtitle,
  rightSubtitle,
  children,
  onQuit,
  footerControls,
  breadcrumb,
}: TallyReportLayoutProps) {
  const navigate = useNavigate();

  const handleQuit = () => {
    if (onQuit) {
      onQuit();
    } else {
      navigate(-1);
    }
  };

  useEscape(handleQuit);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      {/* Shared black title bar (company name as subtitle) */}
      <PageTitleBar title={title} subtitle={companyName} />

      {/* Breadcrumb Navigation */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 bg-white border-b border-gray-200 text-[10px]">
          {breadcrumb.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-black mx-1">›</span>}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  state={crumb.state}
                  className="text-black hover:underline font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-black font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Subtitle Info Area — period/context (left) and report actions (right) */}
      {(leftSubtitle || rightSubtitle || footerControls) && (
        <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3 text-[10px] text-black">{leftSubtitle}</div>
          <div className="flex items-center gap-3 text-[10px] font-bold text-black">
            {rightSubtitle}
            {footerControls}
          </div>
        </div>
      )}

      {/* Main Content Area — flex column so children using h-full/flex-1 fill the
          full height (needed to pin report footers to the bottom). Flex items keep
          min-height:auto, so content-sized children still overflow-scroll normally. */}
      <div className="flex-1 min-h-0 overflow-auto bg-white flex flex-col">{children}</div>
    </div>
  );
}
