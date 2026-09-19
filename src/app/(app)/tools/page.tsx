import type { Metadata } from 'next';
import { Wrench } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { findTool, TOOLS } from '@/features/tools/registry';
import {
  Base64Tool,
  CaseTool,
  CounterTool,
  CsvTool,
  HashTool,
  JsonTool,
  LoremTool,
  PasswordChecker,
  PasswordGenerator,
  QrTool,
  RandomTool,
  ToolCategoryLinks,
  ToolPicker,
  ToolShell,
  UrlTool,
} from '@/features/tools/components';
import {
  AgeTool,
  BmiTool,
  ColorTool,
  CountdownTool,
  CurrencyTool,
  DateDiffTool,
  PercentageTool,
  SplitTool,
  TimezoneTool,
  UnitTool,
} from '@/features/tools/calculators';
import { Card, CardContent, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Utility tools' };

function renderTool(key: string) {
  switch (key) {
    case 'qr':
      return <QrTool />;
    case 'password':
      return <PasswordGenerator />;
    case 'password-check':
      return <PasswordChecker />;
    case 'lorem':
      return <LoremTool />;
    case 'random':
      return <RandomTool />;
    case 'case':
      return <CaseTool />;
    case 'counter':
      return <CounterTool />;
    case 'json':
      return <JsonTool />;
    case 'csv':
      return <CsvTool />;
    case 'base64':
      return <Base64Tool />;
    case 'url':
      return <UrlTool />;
    case 'hash':
      return <HashTool />;
    case 'units':
      return <UnitTool />;
    case 'currency':
      return <CurrencyTool />;
    case 'timezone':
      return <TimezoneTool />;
    case 'color':
      return <ColorTool />;
    case 'percentage':
      return <PercentageTool />;
    case 'bmi':
      return <BmiTool />;
    case 'split':
      return <SplitTool />;
    case 'age':
      return <AgeTool />;
    case 'date-diff':
      return <DateDiffTool />;
    case 'countdown':
      return <CountdownTool />;
    default:
      return <QrTool />;
  }
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage();
  const params = await searchParams;
  const tool = findTool(params.tool);
  const category = params.category ?? 'all';

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Utility tools"
        description={`${TOOLS.length} everyday tools that run in your browser. Nothing you type is saved on the server.`}
        icon={<Wrench className="h-5 w-5" aria-hidden="true" />}
      />

      <Alert tone="info">
        Generators and converters work offline and never send your input anywhere. The only request that leaves your browser is
        asking this server to draw a QR image, and even that text is not stored.
      </Alert>

      <ToolCategoryLinks active={category} />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-max">
          <CardContent className="py-3">
            <ToolPicker active={tool.key} category={category} />
          </CardContent>
        </Card>

        <ToolShell tool={tool}>{renderTool(tool.key)}</ToolShell>
      </div>
    </div>
  );
}
