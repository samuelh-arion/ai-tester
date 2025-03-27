"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function EnvironmentManager() {
  const { environments, addEnvironment, updateEnvironment, removeEnvironment, duplicateEnvironment } = useStore()
  const [newDataKey, setNewDataKey] = useState("")
  const [newDataValue, setNewDataValue] = useState("")
  const [selectedEnvTab, setSelectedEnvTab] = useState<string>(environments[0]?.name || "")

  const handleAddTestData = (envName: string) => {
    if (!newDataKey.trim()) return
    try {
      const parsedValue = JSON.parse(newDataValue)
      updateEnvironment(envName, {
        ...environments.find(e => e.name === envName)!,
        testData: {
          ...environments.find(e => e.name === envName)!.testData,
          [newDataKey]: parsedValue
        }
      })
      setNewDataKey("")
      setNewDataValue("")
    } catch (error) {
      alert('Invalid JSON data')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Environments</h2>
        <Button onClick={() => addEnvironment({
          name: `Environment ${environments.length + 1}`,
          baseUrl: "",
          auth: { type: "none", credentials: {} },
          headers: {},
          timeout: 30000,
          testData: {},
        })}>
          Add Environment
        </Button>
      </div>

      <Tabs value={selectedEnvTab} onValueChange={setSelectedEnvTab}>
        <TabsList className="w-full justify-start h-auto flex-wrap">
          {environments.map((env) => (
            <TabsTrigger key={env.name} value={env.name} className="flex-shrink-0">
              {env.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {environments.map((env) => (
          <TabsContent key={env.name} value={env.name}>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-start">
                  <input
                    type="text"
                    value={env.name}
                    onChange={(e) =>
                      updateEnvironment(env.name, { ...env, name: e.target.value })
                    }
                    className="text-lg font-medium bg-transparent border-none focus:outline-none"
                  />
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => duplicateEnvironment(env.name)}
                    >
                      Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => removeEnvironment(env.name)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="config">
                  <TabsList>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                    <TabsTrigger value="test-data">Test Data</TabsTrigger>
                  </TabsList>

                  <TabsContent value="config" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Base URL</Label>
                      <Input
                        type="text"
                        value={env.baseUrl}
                        onChange={(e) =>
                          updateEnvironment(env.name, { ...env, baseUrl: e.target.value })
                        }
                        placeholder="https://api.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Headers</Label>
                      {Object.entries(env.headers).map(([key, value], index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newHeaders = { ...env.headers }
                              delete newHeaders[key]
                              newHeaders[e.target.value] = value
                              updateEnvironment(env.name, { ...env, headers: newHeaders })
                            }}
                            placeholder="Header name"
                          />
                          <Input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              updateEnvironment(env.name, {
                                ...env,
                                headers: {
                                  ...env.headers,
                                  [key]: e.target.value,
                                },
                              })
                            }}
                            placeholder="Header value"
                          />
                          <Button
                            variant="ghost"
                            onClick={() => {
                              const newHeaders = { ...env.headers }
                              delete newHeaders[key]
                              updateEnvironment(env.name, { ...env, headers: newHeaders })
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => {
                          updateEnvironment(env.name, {
                            ...env,
                            headers: {
                              ...env.headers,
                              "": "",
                            },
                          })
                        }}
                      >
                        Add Header
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="test-data" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`${env.name}-dataKey`}>Data Key</Label>
                        <Input
                          id={`${env.name}-dataKey`}
                          value={newDataKey}
                          onChange={(e) => setNewDataKey(e.target.value)}
                          placeholder="e.g., users.admin"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${env.name}-dataValue`}>Data Value (JSON)</Label>
                        <Textarea
                          id={`${env.name}-dataValue`}
                          value={newDataValue}
                          onChange={(e) => setNewDataValue(e.target.value)}
                          placeholder='e.g., {"username": "admin", "password": "test123"}'
                          rows={4}
                        />
                      </div>
                      <Button onClick={() => handleAddTestData(env.name)}>Add Data</Button>

                      <div>
                        <Label>Current Test Data</Label>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                          <pre className="text-sm">
                            {JSON.stringify(env.testData, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
} 