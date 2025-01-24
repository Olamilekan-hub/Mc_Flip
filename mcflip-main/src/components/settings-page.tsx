'use client'

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Settings, CreditCard, Boxes, LogOut } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <div className="container mx-auto p-4">
        <div className="space-y-8">
          <h1 className="text-2xl font-bold text-primary">Settings</h1>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Timing Settings */}
            <Card className="border-primary/20 bg-card">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="listingTime" className="text-sm font-medium text-primary">
                      Set time between listings (seconds):
                    </label>
                    <Input
                      id="listingTime"
                      type="number"
                      defaultValue="95"
                      className="bg-background border-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="deleteTime" className="text-sm font-medium text-primary">
                      Delete listings older than (hours):
                    </label>
                    <Input
                      id="deleteTime"
                      type="number"
                      defaultValue="64.00"
                      className="bg-background border-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card className="border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">API KEYS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="apiSecret" className="text-sm font-medium text-primary">
                    API Secret:
                  </label>
                  <Input
                    id="apiSecret"
                    type="text"
                    defaultValue="SSZHOBS7WI3MIK3UWWJRTKNAZ24TBHW4"
                    className="font-mono bg-background border-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="apiKey" className="text-sm font-medium text-primary">
                    API Key:
                  </label>
                  <Input
                    id="apiKey"
                    type="text"
                    defaultValue="1e0123484a90ce79d7cc9e11ec5f1b"
                    className="font-mono bg-background border-primary/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save Settings
            </Button>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}