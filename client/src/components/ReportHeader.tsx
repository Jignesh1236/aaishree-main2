interface ReportHeaderProps {
  date: string;
}

const logoUrl = "/adsc-logo-alt.png";

export default function ReportHeader({ date }: ReportHeaderProps) {
  return (
    <div className="mb-6 border-b-2 border-border print:border-b print:border-gray-400 pb-4 print:pb-3 print:mb-4">
      <div className="flex items-start justify-between gap-6 print:gap-3">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="ADSC Logo" className="h-14 w-auto print:h-12" data-testid="img-logo" />
        </div>

        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold text-foreground print:text-black print:text-xl print:mb-1" data-testid="text-company-name">
            Aaishree Data Service Center
          </h1>
          <p className="text-sm text-muted-foreground print:text-gray-700 print:text-sm mt-1" data-testid="text-tagline">
            Daily Business Report
          </p>
        </div>

        <div className="text-right print:border-l print:border-gray-400 print:pl-3">
          <p className="text-xs font-medium text-muted-foreground print:text-gray-600 print:text-xs">Report Date</p>
          <p className="text-base font-semibold text-foreground print:text-black print:text-sm print:font-semibold print:mt-0.5" data-testid="text-report-date">
            {new Date(date).toLocaleDateString('en-IN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>
    </div>
  );
}