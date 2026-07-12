import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function MSMEReports() {
  useEscapeBack();

  const items = ['MSME Form 1 Statement', 'Update Party MSME Details'];

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
        <div className="text-[11px] italic text-black flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-black">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-black">
            Display More Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/statutory" className="hover:underline hover:text-black">
            Statutory Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">MSME Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col pl-3 gap-0.5">
        {items.map((item) => {
          const route = getRoute(item);
          if (route) {
            return (
              <Button
                key={item}
                asChild
                variant="ghost"
                size="xs"
                className="justify-start text-[11px] font-normal px-2 h-7 text-black"
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
              className="justify-start text-[11px] font-normal px-2 h-7 text-black"
            >
              {item}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
