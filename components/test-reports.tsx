"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type TestRun = {
  id: string
  timestamp: string
  duration: number
  totalTests: number
  passed: number
  failed: number
  skipped: number
}

export function TestReports() {
  const [testRuns] = useState<TestRun[]>([
    {
      id: "1",
      timestamp: new Date().toISOString(),
      duration: 1234,
      totalTests: 10,
      passed: 8,
      failed: 1,
      skipped: 1,
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      duration: 2345,
      totalTests: 10,
      passed: 7,
      failed: 2,
      skipped: 1,
    },
  ])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Test Reports</h2>
        <Button>Export Reports</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Tests</div>
          <div className="text-2xl font-bold">
            {testRuns[0]?.totalTests || 0}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Passed</div>
          <div className="text-2xl font-bold text-green-500">
            {testRuns[0]?.passed || 0}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="text-2xl font-bold text-red-500">
            {testRuns[0]?.failed || 0}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Skipped</div>
          <div className="text-2xl font-bold text-yellow-500">
            {testRuns[0]?.skipped || 0}
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-medium">Test Run History</h3>
        </div>
        <div className="divide-y">
          {testRuns.map((run) => (
            <div key={run.id} className="p-4 flex items-center">
              <div className="flex-1">
                <div className="font-medium">Test Run {run.id}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(run.timestamp)}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  Duration: {formatDuration(run.duration)}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">{run.passed}</span>
                  <span>/</span>
                  <span className="text-red-500">{run.failed}</span>
                  <span>/</span>
                  <span className="text-yellow-500">{run.skipped}</span>
                </div>
                <Button variant="ghost">View Details</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 