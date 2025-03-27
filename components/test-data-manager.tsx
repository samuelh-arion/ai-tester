"use client"

import { useState, ChangeEvent } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function TestDataManager() {
  const { testData, setTestData } = useStore()
  const [newDataKey, setNewDataKey] = useState('')
  const [newDataValue, setNewDataValue] = useState('')
  const [importText, setImportText] = useState('')

  const handleAddData = () => {
    if (!newDataKey.trim()) return
    try {
      const parsedValue = JSON.parse(newDataValue)
      setTestData(newDataKey, parsedValue)
      setNewDataKey('')
      setNewDataValue('')
    } catch (error) {
      alert('Invalid JSON data')
    }
  }

  const handleImport = () => {
    try {
      const imported = JSON.parse(importText)
      Object.entries(imported).forEach(([key, value]) => {
        setTestData(key, value)
      })
      setImportText('')
    } catch (error) {
      alert('Invalid JSON format')
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(testData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-data.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dataKey">Data Key</Label>
              <Input
                id="dataKey"
                value={newDataKey}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewDataKey(e.target.value)}
                placeholder="e.g., users.admin"
              />
            </div>
            <div>
              <Label htmlFor="dataValue">Data Value (JSON)</Label>
              <Textarea
                id="dataValue"
                value={newDataValue}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewDataValue(e.target.value)}
                placeholder='e.g., {"username": "admin", "password": "test123"}'
                rows={4}
              />
            </div>
            <Button onClick={handleAddData}>Add Data</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import/Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="importData">Import JSON</Label>
              <Textarea
                id="importData"
                value={importText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImportText(e.target.value)}
                placeholder="Paste JSON data here"
                rows={4}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleImport}>Import</Button>
              <Button onClick={handleExport} variant="outline">
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <pre className="text-sm">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 