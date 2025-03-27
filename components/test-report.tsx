"use client"

import { TestResult } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface TestReportProps {
  results: TestResult[]
}

export function TestReport({ results }: TestReportProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedTests)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedTests(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "skipped":
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      case "skipped":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const totalTests = results.length
  const passedTests = results.filter((r) => r.status === "passed").length
  const failedTests = results.filter((r) => r.status === "failed").length
  const skippedTests = results.filter((r) => r.status === "skipped").length

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="flex-none">
        <CardTitle className="flex items-center justify-between">
          <span>Test Results</span>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-500">
              {passedTests} Passed
            </Badge>
            <Badge variant="default" className="bg-red-500">
              {failedTests} Failed
            </Badge>
            <Badge variant="default" className="bg-yellow-500">
              {skippedTests} Skipped
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="space-y-2 pr-4 max-w-full">
            {results.map((result) => (
              <Collapsible
                key={result.id}
                open={expandedTests.has(result.id)}
                onOpenChange={() => toggleExpanded(result.id)}
                className="border rounded-lg bg-card overflow-hidden"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent rounded-lg">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getStatusIcon(result.status)}
                    <span className="font-medium truncate">{result.scenario}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs whitespace-nowrap",
                        result.status === "passed" && "bg-green-500/20 text-green-500",
                        result.status === "failed" && "bg-red-500/20 text-red-500",
                        result.status === "skipped" && "bg-yellow-500/20 text-yellow-500"
                      )}
                    >
                      {result.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {(result.duration / 1000).toFixed(2)}s
                    </span>
                    {expandedTests.has(result.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-2 space-y-2 border-t bg-muted/50 w-full overflow-hidden">
                  {result.steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-start justify-between py-1 gap-4 w-full"
                    >
                      <div className="flex gap-2 min-w-0 flex-1 overflow-hidden">
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <span className="text-muted-foreground/80 font-medium text-sm">
                            {step.keyword}
                          </span>{" "}
                          <span className="text-sm break-words overflow-hidden">
                            {step.text}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 pt-0.5">
                        <span className="text-xs text-muted-foreground/80 whitespace-nowrap">
                          {(step.duration / 1000).toFixed(3)}s
                        </span>
                      </div>
                    </div>
                  ))}
                  {result.error && (
                    <div className="mt-2 p-3 bg-red-500/10 text-red-500 rounded-lg text-sm font-mono break-words overflow-hidden">
                      {result.error}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 