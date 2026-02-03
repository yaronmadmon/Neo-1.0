/**
 * AreaChartCard Component
 * Reusable area chart card with dynamic data
 * Based on shadcn chart blocks
 */

import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface AreaChartCardProps {
  /** Chart title */
  title: string;
  /** Chart description */
  description?: string;
  /** Data array */
  data: ChartDataPoint[];
  /** Key for X-axis values */
  xAxisKey: string;
  /** Key(s) for Y-axis values - can be multiple for stacked charts */
  dataKeys: string[];
  /** Labels for each data key */
  dataLabels?: Record<string, string>;
  /** Colors for each data key */
  colors?: Record<string, string>;
  /** Show grid lines */
  showGrid?: boolean;
  /** Chart height */
  height?: number;
  /** Trend percentage (for footer) */
  trendPercent?: number;
  /** Trend description */
  trendDescription?: string;
  /** Footer text */
  footerText?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to stack areas */
  stacked?: boolean;
}

export function AreaChartCard({
  title,
  description,
  data,
  xAxisKey,
  dataKeys,
  dataLabels = {},
  colors = {},
  showGrid = true,
  height = 250,
  trendPercent,
  trendDescription,
  footerText,
  className,
  stacked = false,
}: AreaChartCardProps) {
  // Build chart config
  const chartConfig: ChartConfig = {};
  dataKeys.forEach((key, index) => {
    const defaultColors = ['var(--primary)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
    chartConfig[key] = {
      label: dataLabels[key] || key,
      color: colors[key] || defaultColors[index % defaultColors.length],
    };
  });

  const isPositive = trendPercent !== undefined && trendPercent >= 0;
  const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
          >
            {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                // Shorten month names if they look like dates
                if (typeof value === 'string' && value.length > 3) {
                  return value.slice(0, 3);
                }
                return String(value);
              }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`var(--color-${key})`}
                fillOpacity={stacked ? 0.6 - index * 0.15 : 0.4}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
      {(trendPercent !== undefined || footerText) && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {trendPercent !== undefined && (
            <div className="flex gap-2 font-medium leading-none">
              {trendDescription || `Trending ${isPositive ? 'up' : 'down'} by ${Math.abs(trendPercent)}%`}
              <TrendIcon className={cn('size-4', isPositive ? 'text-green-500' : 'text-red-500')} />
            </div>
          )}
          {footerText && (
            <div className="text-muted-foreground">
              {footerText}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export default AreaChartCard;
