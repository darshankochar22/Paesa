import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function MSMEReports() {
  const navigate = useNavigate();

  const items = ['MSME Form 1 Statement', 'Update Party MSME Details', 'Quit'];

  const getRoute = (item: string) => {
    if (item === 'MSME Form 1 Statement') {
      return '/reports/statutory/msme/form-1';
    }
    if (item === 'Update Party MSME Details') {
      return '/reports/statutory/msme/update-party';
    }
    return null;
  };

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">
            Display More Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/statutory" className="hover:underline hover:text-zinc-900">
            Statutory Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">MSME Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col pl-3 gap-0.5">
        {items.map((item) => {
          if (item === 'Quit') {
            return (
              <Button
                key={item}
                onClick={() => navigate(-1)}
                variant="ghost"
                size="xs"
                className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900"
              >
                {item}
              </Button>
            );
          }

          const route = getRoute(item);
          if (route) {
            return (
              <Button
                key={item}
                asChild
                variant="ghost"
                size="xs"
                className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
              >
                <Link to={route}>{item}</Link>
              </Button>
            );
          }

          return (
            <Button
              key={item}
              variant="ghost"
              size="xs"
              disabled
              className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-400"
            >
              {item}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
