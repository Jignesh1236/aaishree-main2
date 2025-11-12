interface ReportHeaderProps {
  date: string;
}

const logoUrl = "/adsc-logo-alt.png";

export default function ReportHeader({ date }: ReportHeaderProps) {
  return (
    <div className="mb-6 border-b-2 border-border print:border-b print:border-gray-400 pb-4 print:pb-6 print:mb-8">
      <div className="flex items-start justify-between gap-6 print:gap-4">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="ADSC Logo" className="h-14 w-auto print:h-16" data-testid="img-logo" />
        </div>

        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold text-foreground print:text-black print:text-3xl print:mb-1" data-testid="text-company-name">
            Aaishree Data Service Center
          </h1>
          <p className="text-sm text-muted-foreground print:text-gray-700 print:text-base mt-1" data-testid="text-tagline">
            Daily Business Report
          </p>
        </div>

        <div className="text-right print:border-l print:border-gray-400 print:pl-4">
          <p className="text-xs font-medium text-muted-foreground print:text-gray-600 print:text-sm">Report Date</p>
          <p className="text-base font-semibold text-foreground print:text-black print:text-base print:font-semibold print:mt-1" data-testid="text-report-date">
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