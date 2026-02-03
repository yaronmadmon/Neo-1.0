/**
 * Setup Summary Component
 * 
 * Shows "Here's what I set up" after app generation.
 * Displays what the system understood and assumed, with options to adjust.
 */
import React, { useState } from 'react';
import { useAppConfiguration } from '../context/AppConfigurationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Check, ChevronDown, ChevronUp, Settings, Sparkles } from 'lucide-react';

interface SetupSummaryProps {
  /** Summary messages to display */
  summary?: string[];
  /** Welcome message */
  welcomeMessage?: string;
  /** Callback when user wants to adjust settings */
  onAdjust?: () => void;
  /** Callback when user confirms and proceeds */
  onProceed?: () => void;
  /** Whether to show as dismissible overlay */
  overlay?: boolean;
  /** Whether to auto-dismiss after a delay */
  autoDismiss?: boolean;
  /** Auto-dismiss delay in ms */
  autoDismissDelay?: number;
}

export function SetupSummary({
  summary,
  welcomeMessage,
  onAdjust,
  onProceed,
  overlay = false,
  autoDismiss = false,
  autoDismissDelay = 5000,
}: SetupSummaryProps) {
  const { configuration, businessName, complexity } = useAppConfiguration();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Use provided summary or generate from configuration
  const displaySummary = summary || configuration.setupSummary || generateDefaultSummary(configuration);
  const displayWelcome = welcomeMessage || configuration.welcomeMessage || generateWelcome(businessName);

  // Auto-dismiss
  React.useEffect(() => {
    if (autoDismiss && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true);
        onProceed?.();
      }, autoDismissDelay);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, dismissed, onProceed]);

  if (dismissed) return null;

  const content = (
    <Card className={`${overlay ? 'shadow-lg' : ''} border-primary/20`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{displayWelcome}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription>
          Here's what I set up based on what you told me
        </CardDescription>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          {/* Summary list */}
          <ul className="space-y-2 mb-4">
            {displaySummary.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          {/* Complexity badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Mode:</span>
            <Badge variant={complexity === 'simple' ? 'secondary' : complexity === 'advanced' ? 'default' : 'outline'}>
              {complexity === 'simple' ? 'Solo' : complexity === 'advanced' ? 'Team' : 'Standard'}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={() => {
              setDismissed(true);
              onProceed?.();
            }} className="flex-1">
              Looks good
            </Button>
            <Button variant="outline" onClick={onAdjust}>
              <Settings className="h-4 w-4 mr-1" />
              Adjust
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
        <div className="max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

/**
 * Generate default summary from configuration
 */
function generateDefaultSummary(config: any): string[] {
  const summary: string[] = [];
  
  // Industry
  const kitName = config.kitId?.replace(/-/g, ' ').replace(/_/g, ' ');
  if (kitName && kitName !== 'general business') {
    summary.push(`Set up as a ${kitName} business`);
  }
  
  // Complexity
  if (config.complexity === 'simple') {
    summary.push('Configured for solo use');
  } else if (config.complexity === 'advanced') {
    summary.push('Configured for team use with full features');
  }
  
  // Key features
  const features = config.features || {};
  if (features.scheduling === 'prominent') {
    summary.push('Scheduling prominently featured');
  }
  if (features.invoicing === 'prominent') {
    summary.push('Invoicing ready to use');
  }
  
  // Hidden features
  const hidden: string[] = [];
  if (features.teamManagement === 'hidden') hidden.push('team management');
  if (features.inventory === 'hidden') hidden.push('inventory');
  if (features.customerPortal === 'hidden') hidden.push('customer portal');
  
  if (hidden.length > 0 && hidden.length <= 3) {
    summary.push(`Hidden: ${hidden.join(', ')} (enable in Settings)`);
  }
  
  return summary.length > 0 ? summary : ['Your app is ready to use'];
}

/**
 * Generate welcome message
 */
function generateWelcome(businessName: string): string {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  if (hour >= 17) greeting = 'Good evening';
  
  if (businessName && businessName !== 'Your Business') {
    return `${greeting}, ${businessName}!`;
  }
  return `${greeting}!`;
}

/**
 * Compact inline version of setup summary
 */
export function SetupSummaryBanner({
  summary,
  onAdjust,
}: {
  summary?: string[];
  onAdjust?: () => void;
}) {
  const { configuration } = useAppConfiguration();
  const displaySummary = summary || configuration.setupSummary || [];
  
  if (displaySummary.length === 0) return null;

  return (
    <div className="bg-primary/5 border-l-4 border-primary px-4 py-3 rounded-r-md flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          {displaySummary[0]}
          {displaySummary.length > 1 && (
            <span className="text-xs ml-1">+{displaySummary.length - 1} more</span>
          )}
        </span>
      </div>
      {onAdjust && (
        <Button variant="ghost" size="sm" onClick={onAdjust}>
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
